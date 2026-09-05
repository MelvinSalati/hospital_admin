<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Services\Service;
use App\Models\Patients\ImagingOrder;
use App\Models\Patients\Patient;
use App\Models\Patients\Admission;
use App\Helpers\VisitTokenHelper;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Models\Patients\PatientVisitScheme;
use App\Models\Patients\ImagingOrderItem;
use App\Models\Payments\Invoice;


class RadiologyController extends Controller
{
    protected $imagingOrderController;
    protected $visitTokenHelper;

    public function __construct()
    {
        $this->imagingOrderController = new ImagingOrderController();
        $this->visitTokenHelper = new VisitTokenHelper();
    }

    /**
     * Display a listing of the resource.
     */
    public function index(int $patientId)
    {
        try {

         // Get active visit token for payment scheme
            $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
            $schemeSelected = PatientVisitScheme::where('token', $activeToken['token'])
                ->value('scheme_id');
            $radiology =  Service::where('scheme_type', $schemeSelected)
                ->where('service_category', 'Imaging')
                ->get();


            $imagingOrders = ImagingOrder::where('patient_id', $patientId)
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'order_number' => $order->order_number,
                        'service_name' => $order->items->first()->service_name ?? 'Imaging Service',
                        'service_category' => 'Imaging',
                        'quantity' => $order->quantity,
                        'unit_price' => $order->total_amount / ($order->quantity ?: 1),
                        'total_price' => $order->total_amount,
                        'status' => $order->status,
                        'priority' => $order->priority,
                        'modality' => $order->modality,
                        'body_part' => $order->body_part,
                        'created_at' => $order->created_at?->toDateTimeString(),
                    ];
                });

            // Get admission number if patient is admitted
            $admission = Admission::where('patient_id', $patientId)
                ->where('status', 'active')
                ->first();

            $patient = Patient::find($patientId);

            return Inertia::render('patients/radiology', [
                'patientId' => $patientId,
                'services' =>  $radiology,
                'previousOrders' => $imagingOrders,
            ]);
        } catch (\Exception $e) {
            Log::error('Radiology Index Error: ' . $e->getMessage());

            return Inertia::render('patients/radiology', [
                'patientId' => $patientId,
                'services' => [],
                'previousOrders' => [],
                'patient' => null,
                'admissionNumber' => null,
                'error' => 'Unable to load radiology data. Please try again.',
            ]);
        }
    }

    /**
     * Store a newly created imaging order.
     * Matches the endpoint expected by ImagingTab
     */
    public function store(Request $request, int $patientId)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:services,id',
            'items.*.service_name' => 'required|string',
            'items.*.category' => 'nullable|string',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.quantity' => 'sometimes|integer|min:1',
            'items.*.notes' => 'nullable|string',
            'items.*.priority' => 'sometimes|in:routine,urgent,emergency,stat',
            'items.*.modality' => 'nullable|string',
            'items.*.body_part' => 'nullable|string',
            'total_amount' => 'required|numeric|min:0',
            'patient_id' => 'required|exists:patients,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 422,
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $items = $request->input('items');

        if (empty($items)) {
            return response()->json([
                'success' => false,
                'message' => 'No services provided'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Get visit token
            $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
            $visitToken = $activeToken['token'] ?? null;

            if (!$visitToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active visit token found for this patient'
                ], 400);
            }

            // Get or create invoice for this visit token
            $invoice = Invoice::firstOrCreate(
                ['visit_token' => $visitToken, 'status' => 'pending'],
                [
                    'patient_id' => $patientId,
                    'invoice_number' => $this->generateInvoiceNumber(),
                    'payment_scheme' => $request->input('scheme', 'cash'),
                    'currency' => 'ZMW',
                    'issue_date' => now(),
                    'due_date' => now()->addDays(30),
                    'status' => 'draft',
                    'subtotal' => 0,
                    'tax' => 0,
                    'discount' => 0,
                    'total' => 0,
                    'due_amount' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Generate a unique order number for the imaging order
            $orderNumber = 'IMG-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

            // Calculate total
            $totalAmount = $request->input('total_amount');

            // Get the first item's details for the main order fields
            $firstItem = $items[0];

            // Get admission number if provided
            $admissionNumber = $request->input('admission_number');
            $admission = null;
            if ($admissionNumber) {
                $admission = Admission::where('admission_number', $admissionNumber)->first();
            }

            // Create the main imaging order
            $imagingOrder = ImagingOrder::create([
                'order_number' => $orderNumber,
                'visit_token' => $visitToken,
                'patient_id' => $patientId,
                'invoice_id' => $invoice->id, // Link to invoice
                'admission_id' => $admission?->id,
                'admission_number' => $admissionNumber,
                'modality' => $firstItem['modality'] ?? 'General',
                'body_part' => $firstItem['body_part'] ?? 'General',
                'priority' => $firstItem['priority'] ?? 'routine',
                'clinical_indication' => $firstItem['notes'] ?? null,
                'status' => 'pending',
                'scheme' => $request->input('scheme', 'cash'),
                'total_amount' => $totalAmount,
                'ordered_by' => Auth::id(),
                'ordered_date' => now(),
                'is_admitted' => $admission ? 1 : 0,
                'notes' => $request->input('notes'),
            ]);

            // Prepare invoice items array
            $invoiceItems = [];
            $imagingOrderItems = [];

            // Create imaging order items and prepare invoice items
            foreach ($items as $index => $item) {
                $quantity = $item['quantity'] ?? 1;
                $price = $item['price'];
                $total = $price * $quantity;

                // Create imaging order item
                $imagingOrderItem = ImagingOrderItem::create([
                    'imaging_order_id' => $imagingOrder->id,
                    'visit_token' => $visitToken,
                    'service_id' => $item['id'],
                    'service_name' => $item['service_name'],
                    'modality' => $item['modality'] ?? 'General',
                    'body_part' => $item['body_part'] ?? 'General',
                    'price' => $price,
                    'quantity' => $quantity,
                    'total' => $total,
                    'priority' => $item['priority'] ?? 'routine',
                    'status' => 'pending',
                ]);

                $imagingOrderItems[] = $imagingOrderItem;

                // Prepare invoice item
                $invoiceItems[] = [
                    'service_id' => $item['id'],
                    'service_name' => $item['service_name'],
                    'category' => $item['category'] ?? 'Imaging',
                    'modality' => $item['modality'] ?? 'General',
                    'body_part' => $item['body_part'] ?? 'General',
                    'priority' => $item['priority'] ?? 'routine',
                    'price' => $price,
                    'quantity' => $quantity,
                    'total' => $total,
                    'imaging_order_id' => $imagingOrder->id,
                    'imaging_order_item_id' => $imagingOrderItem->id,
                    'notes' => $item['notes'] ?? null,
                ];
            }

            // Update invoice with items
            $existingItems = $invoice->items ?? [];
            $updatedItems = array_merge($existingItems, $invoiceItems);

            // Calculate new totals
            $subtotal = $invoice->subtotal + $totalAmount;
            $total = $subtotal + ($invoice->tax ?? 0) - ($invoice->discount ?? 0);

            // Update invoice
            $invoice->update([
                'subtotal' => $subtotal,
                'total' => $total,
                'due_amount' => $total - ($invoice->paid_amount ?? 0),
                'items' => $updatedItems,
            ]);

            DB::commit();

            // Load relationships for response
            $imagingOrder->load('items');
            $invoice->refresh();

            return response()->json([
                'success' => true,
                'message' => count($items) . ' imaging service(s) ordered successfully.',
                'data' => [
                    'order' => $imagingOrder,
                    'order_items' => $imagingOrderItems,
                    'invoice' => $invoice,
                    'invoice_id' => $invoice->id,
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating imaging order: ' . $e->getMessage(), [
                'patient_id' => $patientId,
                'items' => $items,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create imaging order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate a unique invoice number
     */
    private function generateInvoiceNumber(): string
    {
        $prefix = 'INV-' . date('Ymd') . '-';
        $lastInvoice = Invoice::where('invoice_number', 'like', $prefix . '%')
            ->orderBy('invoice_number', 'desc')
            ->first();

        if ($lastInvoice) {
            $lastNumber = (int) substr($lastInvoice->invoice_number, -4);
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . $newNumber;
    }

    /**
     * Update order status
     */
    public function updateStatus(Request $request, $id)
    {
        return $this->imagingOrderController->updateStatus($request, $id);
    }

    /**
     * Cancel an order
     */
    public function cancel($id, Request $request)
    {
        return $this->imagingOrderController->cancel($id, $request);
    }

    /**
     * Get order details
     */
    public function show($id)
    {
        try {
            $order = ImagingOrder::with(['items', 'invoice', 'patient'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $order
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }
    }

    /**
     * Get orders by visit token
     */
    public function getByVisitToken($visitToken)
    {
        return $this->imagingOrderController->getByVisitToken($visitToken);
    }

    /**
     * Get summary statistics for radiology
     */
    public function getSummary($patientId)
    {
        try {
            $summary = [
                'total_orders' => ImagingOrder::where('patient_id', $patientId)->count(),
                'pending_orders' => ImagingOrder::where('patient_id', $patientId)
                    ->whereIn('status', ['pending', 'scheduled'])
                    ->count(),
                'completed_orders' => ImagingOrder::where('patient_id', $patientId)
                    ->where('status', 'completed')
                    ->count(),
                'cancelled_orders' => ImagingOrder::where('patient_id', $patientId)
                    ->where('status', 'cancelled')
                    ->count(),
                'total_amount' => ImagingOrder::where('patient_id', $patientId)
                    ->where('status', '!=', 'cancelled')
                    ->sum('total_amount'),
            ];

            return response()->json([
                'success' => true,
                'data' => $summary
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch summary'
            ], 500);
        }
    }

    /**
     * Get available modalities
     */
    public function getModalities()
    {
        $modalities = [
            'X-Ray',
            'Ultrasound',
            'CT Scan',
            'MRI',
            'Mammogram',
            'Fluoroscopy',
            'PET Scan',
            'Nuclear Medicine',
            'DEXA Scan',
            'Angiography'
        ];

        return response()->json([
            'success' => true,
            'data' => $modalities
        ], 200);
    }

    /**
     * Get body parts for imaging
     */
    public function getBodyParts()
    {
        $bodyParts = [
            'Head',
            'Neck',
            'Chest',
            'Abdomen',
            'Pelvis',
            'Spine',
            'Upper Extremity',
            'Lower Extremity',
            'Knee',
            'Shoulder',
            'Hip',
            'Ankle',
            'Wrist',
            'Elbow'
        ];

        return response()->json([
            'success' => true,
            'data' => $bodyParts
        ], 200);
    }
}
