<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Models\Patients\LabOrder;
use App\Models\Patients\LabOrderItem;
use App\Models\Services\Service;
use App\Models\Patients\Patient;
use App\Models\Patients\Admission;
use App\Models\Payments\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Helpers\VisitTokenHelper;

class LabOrderController extends Controller
{
    /**
     * Get active visit token for patient
     */
    public function token(int $patientId)
    {
        $visitTokenHelper = new VisitTokenHelper();
        $activeToken = $visitTokenHelper->getActiveTokenArray($patientId);
        return $activeToken['token'] ?? null;
    }

    /**
     * Get all lab orders for a patient
     */
    public function index($patientId)
    {
        try {
            $orders = LabOrder::with(['items', 'orderedBy', 'invoice'])
                ->where('patient_id', $patientId)
                ->orderBy('ordered_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $orders
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch lab orders: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch lab orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific lab order with details
     */
    public function show($id)
    {
        try {
            $order = LabOrder::with(['items', 'orderedBy', 'collectedBy', 'items.performedBy', 'invoice'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $order
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lab order not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create a new lab order with invoice (appends to existing invoice by visit_token)
     */
    /**
     * Create a new lab order with invoice (appends to existing invoice by visit_token)
     */
    /**
     * Create a new lab order with invoice (appends to existing invoice by visit_token)
     */
    /**
     * Create a new lab order with invoice (appends to existing invoice by visit_token)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'services' => 'required|array|min:1',
            'services.*.id' => 'required|exists:services,id',
            'services.*.service_name' => 'required|string',
            'services.*.service_category' => 'required|string',
            'services.*.price' => 'required|numeric|min:0',
            'services.*.quantity' => 'sometimes|integer|min:1',
            'services.*.notes' => 'nullable|string',
            'services.*.priority' => 'sometimes|in:routine,urgent,stat',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 422,
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $patientId = $request->input('patient_id');
        $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
        $token = $activeToken['token'] ?? null;

        if (! $token) {
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => 'No active visit found. Please start a visit to continue.',
            ], 400);
        }

        // Normalise payment scheme
        $paymentMethod = $request->input('scheme', $activeToken['payment_method'] ?? 'cash');
        if ($paymentMethod === 'mobile_money') {
            $paymentMethod = 'cash';
        }

        DB::beginTransaction();

        try {
            $patient = Patient::findOrFail($patientId);
            $serviceType = 'laboratory';
            $totalAmount = 0;
            $invoiceItems = [];

            foreach ($request->input('services') as $service) {
                $serviceRecord = Service::find($service['id']);

                if (! $serviceRecord) {
                    throw new \Exception("Service not found: {$service['service_name']}");
                }

                $quantity = (int) ($service['quantity'] ?? 1);
                $priority = $service['priority'] ?? 'routine';
                $unitPrice = $this->getPriceByScheme($serviceRecord, $paymentMethod);

                // Allow frontend to override price
                if (isset($service['price']) && (float) $service['price'] > 0) {
                    $unitPrice = (float) $service['price'];
                }

                if (! $unitPrice || $unitPrice <= 0) {
                    throw new \Exception(
                        "No valid price for \"{$serviceRecord->service_name}\" under scheme \"{$paymentMethod}\"."
                    );
                }

                $totalPrice = $unitPrice * $quantity;
                $totalAmount += $totalPrice;

                $invoiceItems[] = [
                    'service_id' => $service['id'],
                    'service_name' => $service['service_name'],
                    'service_category' => $service['service_category'],
                    'price' => $unitPrice,
                    'quantity' => $quantity,
                    'total' => $totalPrice,
                    'type' => $serviceType,
                    'priority' => $priority,
                    'created_at' => now()->toDateTimeString(),
                ];
            }

            // Find or create invoice
            $existingInvoice = Invoice::where('visit_token', $token)
                ->whereIn('status', ['draft', 'unpaid'])
                ->where('patient_id', $patientId)
                ->first();

            $isAppended = false;

            if ($existingInvoice) {
                // Parse existing items
                $existingItems = $existingInvoice->items;
                if (is_string($existingItems)) {
                    $parsedExisting = json_decode($existingItems, true) ?: [];
                } elseif (is_array($existingItems)) {
                    $parsedExisting = $existingItems;
                } else {
                    $parsedExisting = [];
                }

                // Merge new items
                $mergedItems = array_merge($parsedExisting, $invoiceItems);
                $newTotal = $existingInvoice->total + $totalAmount;

                $existingInvoice->update([
                    'items' => $mergedItems,
                    'subtotal' => $newTotal,
                    'total' => $newTotal,
                    'due_amount' => $existingInvoice->due_amount + $totalAmount,
                ]);

                $invoice = $existingInvoice->fresh();
                $isAppended = true;

                Log::info('Laboratory: appended to existing invoice', [
                    'invoice_id' => $invoice->id,
                    'visit_token' => $token,
                    'items_added' => count($invoiceItems),
                    'amount_added' => $totalAmount,
                ]);
            } else {
                // Create new invoice
                $invoice = Invoice::create([
                    'invoice_number' => Invoice::generateInvoiceNumber(),
                    'patient_id' => $patient->id,
                    'user_id' => Auth::id(),
                    'visit_token' => $token,
                    'customer_name' => $patient->name,
                    'customer_email' => $patient->email ?? null,
                    'customer_phone' => $patient->phone ?? null,
                    'customer_address' => $patient->address ?? null,
                    'subtotal' => $totalAmount,
                    'tax' => 0,
                    'discount' => 0,
                    'total' => $totalAmount,
                    'paid_amount' => 0,
                    'due_amount' => $totalAmount,
                    'currency' => 'ZMW',
                    'payment_scheme' => $paymentMethod,
                    'items' => $invoiceItems,
                    'issue_date' => now(),
                    'due_date' => now()->addDays(30),
                    'status' => 'unpaid',
                    'invoice_type' => 'laboratory',
                ]);

                Log::info('Laboratory: created new invoice', [
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'visit_token' => $token,
                    'items_count' => count($invoiceItems),
                    'total' => $totalAmount,
                ]);
            }

            // Get priority for the order
            $priorities = array_column($request->input('services'), 'priority');
            $orderPriority = 'routine';
            if (in_array('stat', $priorities)) {
                $orderPriority = 'stat';
            } elseif (in_array('urgent', $priorities)) {
                $orderPriority = 'urgent';
            }

            // Generate order number
            $orderNumber = $this->generateLaboratoryOrderNumber();

            // Create Lab Order in lab_orders table - matching your exact table structure
            DB::table('lab_orders')->insert([
                'order_number' => $orderNumber,
                'test_name' => $service['service_name'],
                'visit_token' => $token,
                'patient_id' => $patientId,
                'admission_id' => null,
                'invoice_id' => $invoice->id,
                'is_admitted' => 0,
                'admission_number' => null,
                'scheme' => $paymentMethod,
                'clinical_notes' => null,
                'status' => 'pending',
                'priority' => $orderPriority,
                'ordered_by' => Auth::id(),
                'ordered_date' => now(),
                'collected_date' => null,
                'collected_by' => null,
                'processing_date' => null,
                'completed_date' => null,
                'cancelled_date' => null,
                'cancelled_reason' => null,
                'total_amount' => $totalAmount,
                'created_at' => now(),
                'updated_at' => now(),
                'deleted_at' => null,
            ]);

            // Get the inserted lab order ID
            $labOrderId = DB::getPdo()->lastInsertId();

            Log::info('Laboratory: created lab order', [
                'order_id' => $labOrderId,
                'order_number' => $orderNumber,
            ]);

            // Create Lab Order Items in lab_order_items table (CORRECTED - was inserting into lab_orders before)
            foreach ($request->input('services') as $service) {
                $serviceRecord = Service::find($service['id']);
                $quantity = (int) ($service['quantity'] ?? 1);
                $priority = $service['priority'] ?? 'routine';
                $unitPrice = $this->getPriceByScheme($serviceRecord, $paymentMethod);

                if (isset($service['price']) && (float) $service['price'] > 0) {
                    $unitPrice = (float) $service['price'];
                }

                $totalPrice = $unitPrice * $quantity;

                // FIXED: Now inserting into lab_order_items instead of lab_orders
                DB::table('lab_order_items')->insert([
                    'lab_order_id' => $labOrderId,  // Link back to parent order
                    'patient_id' => $patientId,
                    'order_number' => $orderNumber,
                    'visit_token' => $token,
                    'test_id' => $service['id'],
                    'test_name' => $service['service_name'],
                    'test_category' => $service['service_category'] ?? 'Laboratory',
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'priority' => $priority,
                    'notes' => $service['notes'] ?? null,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Log::info('Laboratory: created lab order items', [
                'order_id' => $labOrderId,
                'items_count' => count($request->input('services')),
            ]);

            DB::commit();

            $returnItems = array_map(fn($item) => [
                'id' => $item['id'],
                'name' => $item['service_name'],
                'price' => isset($item['price']) ? (float) $item['price'] : 0,
                'quantity' => (int) ($item['quantity'] ?? 1),
                'total' => (isset($item['price']) ? (float) $item['price'] : 0) * (int) ($item['quantity'] ?? 1),
                'category' => $item['service_category'] ?? 'Laboratory',
                'type' => $serviceType,
                'priority' => $item['priority'] ?? 'routine',
                'date' => now()->toDateTimeString(),
            ], $request->input('services'));

            return response()->json([
                'success' => true,
                'message' => $isAppended
                    ? count($invoiceItems) . ' laboratory test(s) added to existing invoice successfully.'
                    : count($invoiceItems) . ' laboratory test(s) ordered and new invoice created successfully.',
                'data' => [
                    'lab_order_id' => $labOrderId,
                    'order_number' => $orderNumber,
                    'invoice' => [
                        'id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'total' => $invoice->total,
                        'status' => $invoice->status,
                        'payment_scheme' => $invoice->payment_scheme,
                    ],
                    'order_items' => $returnItems,
                    'is_appended' => $isAppended,
                    'total_amount' => $totalAmount,
                    'items_count' => count($invoiceItems),
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Laboratory Order Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'patient_id' => $patientId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to order laboratory test. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate unique order number
     */
    private function generateLaboratoryOrderNumber(): string
    {
        $date = now()->format('Ymd');
        $lastOrder = DB::table('lab_orders')
            ->where('order_number', 'like', "LAB-{$date}-%")
            ->orderByDesc('id')
            ->first();

        if (! $lastOrder) {
            return "LAB-{$date}-0001";
        }

        $lastSequence = (int) substr($lastOrder->order_number, -4);

        return sprintf(
            'LAB-%s-%04d',
            $date,
            $lastSequence + 1
        );
    }

  

    /**
     * Helper: Get overall order priority based on items
     */
    private function getOrderPriority($items)
    {
        $priorities = array_column($items, 'priority');

        if (in_array('stat', $priorities)) {
            return 'stat';
        } elseif (in_array('urgent', $priorities)) {
            return 'urgent';
        }
        return 'routine';
    }

    /**
     * Helper: Get price by scheme from services table
     */
    private function getPriceByScheme($service, $scheme)
    {
        $effectiveScheme = $scheme === 'mobile_money' ? 'cash' : $scheme;

        switch ($effectiveScheme) {
            case 'cash':
                return $service->cash_price ? floatval($service->cash_price) : null;
            case 'nhima':
                return $service->nhima_price ? floatval($service->nhima_price) : null;
            case 'insurance':
                return $service->insurance_price ? floatval($service->insurance_price) : null;
            case 'charity':
                return $service->charity_price ? floatval($service->charity_price) : null;
            default:
                return $service->cash_price ? floatval($service->cash_price) : null;
        }
    }

    /**
     * Update lab order status and update invoice if needed
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,collected,processing,completed,cancelled',
            'reason' => 'required_if:status,cancelled|nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $order = LabOrder::with('invoice')->findOrFail($id);

            // Update status and relevant dates
            $updateData = ['status' => $request->status];

            switch ($request->status) {
                case 'collected':
                    $updateData['collected_date'] = now();
                    $updateData['collected_by'] = Auth::id();
                    break;
                case 'processing':
                    $updateData['processing_date'] = now();
                    break;
                case 'completed':
                    $updateData['completed_date'] = now();
                    break;
                case 'cancelled':
                    $updateData['cancelled_date'] = now();
                    $updateData['cancelled_reason'] = $request->reason;
                    break;
            }

            $order->update($updateData);

            // If cancelling entire order, cancel all items and update invoice
            if ($request->status === 'cancelled') {
                $order->items()->update(['status' => 'cancelled']);

                if ($order->invoice) {
                    $order->invoice->update(['status' => 'cancelled']);
                }
            }

            // If order is completed, mark invoice as completed (but not paid)
            if ($request->status === 'completed' && $order->invoice) {
                $order->invoice->update(['status' => 'completed']);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Lab order status updated',
                'data' => $order->fresh(['items', 'invoice'])
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get invoice for a lab order
     */
    public function getInvoice($orderId)
    {
        try {
            $order = LabOrder::with('invoice')->findOrFail($orderId);

            if (!$order->invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'No invoice found for this lab order'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $order->invoice
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update individual test item status
     */
    public function updateItemStatus(Request $request, $orderId, $itemId)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,collected,processing,completed,cancelled',
            'result_value' => 'required_if:status,completed|nullable|string',
            'reference_range' => 'nullable|string',
            'unit' => 'nullable|string',
            'interpretation' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $item = LabOrderItem::where('lab_orders_id', $orderId)
                ->where('id', $itemId)
                ->firstOrFail();

            $updateData = ['status' => $request->status];

            if ($request->status === 'completed') {
                $updateData['result_value'] = $request->result_value;
                $updateData['reference_range'] = $request->reference_range;
                $updateData['unit'] = $request->unit;
                $updateData['interpretation'] = $request->interpretation;
                $updateData['performed_by'] = Auth::id();
                $updateData['performed_date'] = now();
            }

            $item->update($updateData);

            // Check if all items are completed, then update order status
            if ($request->status === 'completed') {
                $order = LabOrder::find($orderId);
                $allCompleted = $order->items()->where('status', '!=', 'completed')->count() === 0;

                if ($allCompleted && $order->status !== 'completed') {
                    $order->update([
                        'status' => 'completed',
                        'completed_date' => now()
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Test item status updated',
                'data' => $item
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update item status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get results for a lab order
     */
    public function getResults($orderId)
    {
        try {
            $results = LabOrderItem::where('lab_orders_id', $orderId)
                ->where('status', 'completed')
                ->whereNotNull('result_value')
                ->get([
                    'id',
                    'test_id',
                    'test_name',
                    'result_value',
                    'reference_range',
                    'unit',
                    'interpretation',
                    'performed_by',
                    'performed_date',
                    'notes as result_notes'
                ]);

            return response()->json([
                'success' => true,
                'data' => $results
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch results',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all available laboratory tests
     */
    public function getAvailableTests()
    {
        try {
            $tests = Service::where('is_active', true)
                ->where('service_category', 'Laboratory')
                ->orderBy('service_name')
                ->get([
                    'id',
                    'service_name as test_name',
                    'service_category as test_category',
                    'cash_price',
                    'nhima_price',
                    'insurance_price',
                    'charity_price',
                    'turnaround_time',
                    'specimen_type',
                    'preparation_instructions',
                    'reference_range'
                ]);

            return response()->json([
                'success' => true,
                'data' => $tests
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch tests',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
