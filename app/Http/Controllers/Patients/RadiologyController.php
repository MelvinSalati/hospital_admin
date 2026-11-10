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
use App\Events\ImagingOrderCreated; // <-- Added for broadcasting

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

            $radiology = Service::where('scheme_type', $schemeSelected)
                ->where('service_category', 'Imaging')
                ->get();

            $imagingOrders = ImagingOrder::with(['items', 'resultFiles'])
                ->where('patient_id', $patientId)
                ->orderByDesc('created_at')
                ->get()
                ->map(function (ImagingOrder $order) {
                    $firstItem = $order->items->first();

                    $files = $order->resultFiles->map(fn($f) => [
                        'id'          => $f->id,
                        'name'        => $f->file_name,
                        'url'         => $f->file_path
                            ? asset('storage/' . ltrim($f->file_path, '/'))
                            : null,
                        'mime'        => $f->mime_type,
                        'size'        => $f->file_size,
                        'type'        => $f->file_type,
                        'uploaded_at' => optional($f->created_at)->toIso8601String(),
                    ])->values()->all();

                    return [
                        'id'               => $order->id,
                        'order_number'     => $order->order_number,
                        'service_name'     => $firstItem?->service_name
                            ?? (trim(($order->modality ?? '') . ' ' . ($order->body_part ?? '')) ?: 'Imaging Service'),
                        'service_category' => 'Imaging',
                        'quantity'         => $order->items->sum('quantity') ?: 1,
                        'unit_price'       => (float) ($firstItem?->price ?? 0),
                        'total_price'      => (float) ($order->total_amount ?? 0),
                        'status'           => $order->status,
                        'priority'         => $order->priority,
                        'modality'         => $order->modality,
                        'body_part'        => $order->body_part,
                        'created_at'       => optional($order->created_at)->toDateTimeString(),
                        'performed_at'     => optional($order->performed_date)->toIso8601String(),
                        'reported_at'      => optional($order->reported_date)->toIso8601String(),
                        'findings'         => $order->findings,
                        'impression'       => $order->impression,
                        'recommendations'  => $order->recommendations,

                        // Line items — used by RadiologyBundleModal
                        'items' => $order->items->map(fn(ImagingOrderItem $i) => [
                            'id'           => $i->id,
                            'service_name' => $i->service_name
                                ?? (trim(($i->modality ?? '') . ' ' . ($i->body_part ?? '')) ?: 'Imaging Study'),
                            'modality'     => $i->modality,
                            'body_part'    => $i->body_part,
                            'quantity'     => (int) ($i->quantity ?? 1),
                            'price'        => (float) ($i->price ?? 0),
                            'total'        => (float) ($i->total ?? 0),
                            'priority'     => $i->priority,
                            'notes'        => $i->notes ?? null,
                            'status'       => $i->status,
                        ])->values()->all(),

                        // Files — used by RadiologyImagesDrawer
                        'files' => $files,
                    ];
                });

            // Get admission number if patient is admitted
            $admission = Admission::where('patient_id', $patientId)
                ->where('status', 'active')
                ->first();

            $patient = Patient::find($patientId);

            return Inertia::render('patients/radiology', [
                'patientId'      => $patientId,
                'services'       => $radiology,
                'previousOrders' => $imagingOrders,
                'patient'        => $patient,
                'admissionNumber' => $admission?->admission_number,
            ]);
        } catch (\Exception $e) {
            Log::error('Radiology Index Error: ' . $e->getMessage());

            return Inertia::render('patients/radiology', [
                'patientId'       => $patientId,
                'services'        => [],
                'previousOrders'  => [],
                'patient'         => null,
                'admissionNumber' => null,
                'error'           => 'Unable to load radiology data. Please try again.',
            ]);
        }
    }

    /**
     * Store a newly created imaging order.
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
            'ordered_by' => 'required|exists:users,id'
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
            $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
            $visitToken = $activeToken['token'] ?? null;

            if (!$visitToken) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'No active visit token found for this patient'
                ], 400);
            }

            $paymentMethod = $request->input('scheme', $activeToken['payment_method'] ?? 'cash');
            if ($paymentMethod === 'mobile_money') {
                $paymentMethod = 'cash';
            }

            $patient = Patient::findOrFail($patientId);

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
                    ''
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

            $totalAmount = $calculatedTotal;

            $admissionNumber = $request->input('admission_number');
            $admission = null;
            if ($admissionNumber) {
                $admission = Admission::where('admission_number', $admissionNumber)->first();
            }

            $existingInvoice = Invoice::where('visit_token', $visitToken)
                ->whereIn('status', ['draft', 'unpaid'])
                ->where('patient_id', $patientId)
                ->first();

            $isAppended = false;

            if ($existingInvoice) {
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
            }

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
                'ordered_by'          => $request->ordered_by,
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

            // ------------------------------------------------------------------
            // Broadcast the event
            // ------------------------------------------------------------------
            $imagingOrder->load(['items', 'patient']);
            $invoice->refresh();

            try {
                ImagingOrderCreated::dispatch($imagingOrder);
            } catch (\Throwable $broadcastError) {
                Log::warning('Imaging order broadcast failed', [
                    'order_id' => $imagingOrder->id,
                    'error'    => $broadcastError->getMessage(),
                ]);
            }

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
