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

        DB::beginTransaction();

        try {
            // ------------------------------------------------------------------
            // 1. Resolve visit token
            // ------------------------------------------------------------------
            $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
            $visitToken = $activeToken['token'] ?? null;

            if (!$visitToken) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'No active visit token found for this patient'
                ], 400);
            }

            // Normalise payment scheme (mirror laboratory behaviour)
            $paymentMethod = $request->input('scheme', $activeToken['payment_method'] ?? 'cash');
            if ($paymentMethod === 'mobile_money') {
                $paymentMethod = 'cash';
            }

            $patient = Patient::findOrFail($patientId);

            // ------------------------------------------------------------------
            // 2. Build order number + prepare invoice items
            // ------------------------------------------------------------------
            $orderNumber = 'IMG-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
            $totalAmount = (float) $request->input('total_amount');
            $firstItem = $items[0];

            $invoiceItems = [];
            $orderItemPayloads = [];
            $calculatedTotal = 0;

            foreach ($items as $item) {
                $quantity = (int) ($item['quantity'] ?? 1);
                $price    = (float) $item['price'];
                $lineTotal = $price * $quantity;
                $calculatedTotal += $lineTotal;

                $invoiceItems[] = [
                    'service_id'       => $item['id'],
                    'service_name'     => $item['service_name'],
                    'service_category' => $item['category'] ?? 'Imaging',
                    'modality'         => $item['modality'] ?? 'General',
                    'body_part'        => $item['body_part'] ?? 'General',
                    'priority'         => $item['priority'] ?? 'routine',
                    'price'            => $price,
                    'quantity'         => $quantity,
                    'total'            => $lineTotal,
                    'type'             => 'imaging',
                    'notes'            => $item['notes'] ?? null,
                    'created_at'       => now()->toDateTimeString(),
                ];

                $orderItemPayloads[] = [
                    'service_id'   => $item['id'],
                    'service_name' => $item['service_name'],
                    'modality'     => $item['modality'] ?? 'General',
                    'body_part'    => $item['body_part'] ?? 'General',
                    'price'        => $price,
                    'quantity'     => $quantity,
                    'total'        => $lineTotal,
                    'priority'     => $item['priority'] ?? 'routine',
                    'notes'        => $item['notes'] ?? null,
                ];
            }

            // Trust the server-side calculation over the client-supplied total
            $totalAmount = $calculatedTotal;

            // ------------------------------------------------------------------
            // 3. Resolve admission (optional)
            // ------------------------------------------------------------------
            $admissionNumber = $request->input('admission_number');
            $admission = null;
            if ($admissionNumber) {
                $admission = Admission::where('admission_number', $admissionNumber)->first();
            }

            // ------------------------------------------------------------------
            // 4. Find existing open invoice OR create a new one
            //    (mirrors LaboratoryController logic exactly)
            // ------------------------------------------------------------------
            $existingInvoice = Invoice::where('visit_token', $visitToken)
                ->whereIn('status', ['draft', 'unpaid'])
                ->where('patient_id', $patientId)
                ->first();

            $isAppended = false;

            if ($existingInvoice) {
                // Parse existing items (could be JSON string OR array)
                $existingItems = $existingInvoice->items;
                if (is_string($existingItems)) {
                    $parsedExisting = json_decode($existingItems, true) ?: [];
                } elseif (is_array($existingItems)) {
                    $parsedExisting = $existingItems;
                } else {
                    $parsedExisting = [];
                }

                $mergedItems = array_merge($parsedExisting, $invoiceItems);
                $newTotal = $existingInvoice->total + $totalAmount;

                $existingInvoice->update([
                    'items'      => $mergedItems,
                    'subtotal'   => $newTotal,
                    'total'      => $newTotal,
                    'due_amount' => $existingInvoice->due_amount + $totalAmount,
                ]);

                $invoice = $existingInvoice->fresh();
                $isAppended = true;

                Log::info('Radiology: appended to existing invoice', [
                    'invoice_id'   => $invoice->id,
                    'visit_token'  => $visitToken,
                    'items_added'  => count($invoiceItems),
                    'amount_added' => $totalAmount,
                ]);
            } else {
                $invoice = Invoice::create([
                    'invoice_number'  => Invoice::generateInvoiceNumber(),
                    'patient_id'      => $patient->id,
                    'user_id'         => Auth::id(),
                    'visit_token'     => $visitToken,
                    'customer_name'   => $patient->name,
                    'customer_email'  => $patient->email ?? null,
                    'customer_phone'  => $patient->phone ?? null,
                    'customer_address' => $patient->address ?? null,
                    'subtotal'        => $totalAmount,
                    'tax'             => 0,
                    'discount'        => 0,
                    'total'           => $totalAmount,
                    'paid_amount'     => 0,
                    'due_amount'      => $totalAmount,
                    'currency'        => 'ZMW',
                    'payment_scheme'  => $paymentMethod,
                    'items'           => $invoiceItems,
                    'issue_date'      => now(),
                    'due_date'        => now()->addDays(30),
                    'status'          => 'unpaid',
                    'invoice_type'    => 'imaging',
                ]);

                Log::info('Radiology: created new invoice', [
                    'invoice_id'     => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'visit_token'    => $visitToken,
                    'items_count'    => count($invoiceItems),
                    'total'          => $totalAmount,
                ]);
            }

            // ------------------------------------------------------------------
            // 5. Create the ImagingOrder (header) and its items
            // ------------------------------------------------------------------
            $imagingOrder = ImagingOrder::create([
                'order_number'        => $orderNumber,
                'visit_token'         => $visitToken,
                'patient_id'          => $patientId,
                'invoice_id'          => $invoice->id,
                'admission_id'        => $admission?->id,
                'admission_number'    => $admissionNumber,
                'modality'            => $firstItem['modality'] ?? 'General',
                'body_part'           => $firstItem['body_part'] ?? 'General',
                'priority'            => $firstItem['priority'] ?? 'routine',
                'clinical_indication' => $firstItem['notes'] ?? null,
                'status'              => 'pending',
                'scheme'              => $paymentMethod,
                'total_amount'        => $totalAmount,
                'ordered_by'          => Auth::id(),
                'ordered_date'        => now(),
                'is_admitted'         => $admission ? 1 : 0,
                'notes'               => $request->input('notes'),
            ]);

            $imagingOrderItems = [];
            foreach ($orderItemPayloads as $payload) {
                $imagingOrderItems[] = ImagingOrderItem::create([
                    'imaging_order_id' => $imagingOrder->id,
                    'visit_token'      => $visitToken,
                    'service_id'       => $payload['service_id'],
                    'service_name'     => $payload['service_name'],
                    'modality'         => $payload['modality'],
                    'body_part'        => $payload['body_part'],
                    'price'            => $payload['price'],
                    'quantity'         => $payload['quantity'],
                    'total'            => $payload['total'],
                    'priority'         => $payload['priority'],
                    'status'           => 'pending',
                ]);
            }

            DB::commit();

            $imagingOrder->load('items');
            $invoice->refresh();

            return response()->json([
                'success' => true,
                'message' => $isAppended
                    ? count($items) . ' imaging service(s) added to existing invoice successfully.'
                    : count($items) . ' imaging service(s) ordered and new invoice created successfully.',
                'data' => [
                    'order'        => $imagingOrder,
                    'order_items'  => $imagingOrderItems,
                    'invoice'      => [
                        'id'             => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'total'          => $invoice->total,
                        'status'         => $invoice->status,
                        'payment_scheme' => $invoice->payment_scheme,
                    ],
                    'is_appended'  => $isAppended,
                    'total_amount' => $totalAmount,
                    'items_count'  => count($items),
                    'order_number' => $orderNumber,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating imaging order: ' . $e->getMessage(), [
                'patient_id' => $patientId,
                'items'      => $items,
                'trace'      => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create imaging order: ' . $e->getMessage(),
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
