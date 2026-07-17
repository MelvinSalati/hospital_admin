<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Models\Patients\ImagingOrder;
use App\Models\Patients\ImagingOrderItem;
use App\Models\Patients\Patient;
use App\Models\Patients\Admission;
use App\Models\Payments\Invoice;
use App\Helpers\VisitTokenHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ImagingOrderController extends Controller
{
    protected $visitTokenHelper;

    public function __construct()
    {
        $this->visitTokenHelper = new VisitTokenHelper();
    }

    /**
     * Get the active visit token for a patient
     */
    private function getVisitToken($patientId)
    {
        $token = $this->visitTokenHelper->getActiveToken($patientId);
        return $token ? $token->token : null;
    }

    /**
     * get the patient payment scheme
     */
    private function getPaymentScheme($patientId)
    {
        $token = $this->visitTokenHelper->getActiveToken($patientId);
        return $token ? $token->payment_method : null;
    }

    /**
     * Get all imaging orders for a patient
     */
    public function index($patientId)
    {
        try {
            $orders = ImagingOrder::with(['items', 'invoice'])
                ->where('patient_id', $patientId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $orders
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch imaging orders: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch imaging orders'
            ], 500);
        }
    }

    /**
     * Store a new imaging order - HANDLES MULTIPLE SERVICES
     */
    public function store(Request $request, $patientId)
    {
        // Log the complete incoming request
        Log::info('ImagingOrderController@store - Request received', [
            'patient_id' => $patientId,
            'request_all' => $request->all(),
            'request_headers' => $request->headers->all(),
            'method' => $request->method(),
            'url' => $request->fullUrl()
        ]);

        // Validate the request
        $validator = Validator::make($request->all(), [
            'services' => 'required|array|min:1',
            'services.*.id' => 'required|exists:services,id',
            'services.*.service_name' => 'required|string|max:255',
            'services.*.price' => 'required|numeric|min:0',
            'services.*.total_amount' => 'required|numeric|min:0',
            'services.*.priority' => 'nullable|in:routine,urgent,emergency,stat',
            'services.*.modality' => 'nullable|string|max:100',
            'services.*.body_part' => 'nullable|string|max:100',
            'services.*.quantity' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            Log::error('Validation failed', ['errors' => $validator->errors()->toArray()]);
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            Log::info('Starting transaction for imaging order', ['patient_id' => $patientId]);

            $patient = Patient::findOrFail($patientId);
            $visitToken = $this->getVisitToken($patientId);

            Log::info('Visit token retrieved', ['visit_token' => $visitToken, 'patient_id' => $patientId]);

            if (!$visitToken) {
                throw new \Exception('No active visit token found for patient: ' . $patientId);
            }

            $paymentScheme = $request->scheme ?: $this->getPaymentScheme($patientId);

            // Normalize payment scheme
            if ($paymentScheme === 'mobile_money') {
                $paymentScheme = 'cash';
            }

            $services = $request->input('services');
            $admissionNumber = $request->admission_number;

            // Calculate total amount for all services
            $totalAmount = 0;
            $invoiceItems = [];
            $imagingOrderItems = [];

            foreach ($services as $index => $service) {
                $quantity = $service['quantity'] ?? 1;
                $price = floatval($service['price']);
                $serviceTotal = $price * $quantity;
                $totalAmount += $serviceTotal;

                Log::info('Processing service', [
                    'index' => $index,
                    'service_id' => $service['id'],
                    'service_name' => $service['service_name'],
                    'price' => $price,
                    'quantity' => $quantity,
                    'total' => $serviceTotal
                ]);

                // Prepare invoice item
                $invoiceItems[] = [
                    'service_type' => 'imaging',
                    'service_id' => $service['id'],
                    'service_name' => $service['service_name'],
                    'modality' => $service['modality'] ?? null,
                    'body_part' => $service['body_part'] ?? null,
                    'price' => $price,
                    'quantity' => $quantity,
                    'total' => $serviceTotal,
                    'priority' => $service['priority'] ?? 'routine',
                    'notes' => $service['notes'] ?? null,
                    'created_at' => now()->toDateTimeString(),
                ];

                // Prepare imaging order item
                $imagingOrderItems[] = [
                    'service_id' => $service['id'],
                    'service_name' => $service['service_name'],
                    'modality' => $service['modality'] ?? null,
                    'body_part' => $service['body_part'] ?? null,
                    'price' => $price,
                    'quantity' => $quantity,
                    'total' => $serviceTotal,
                    'priority' => $service['priority'] ?? 'routine',
                    'clinical_indication' => $service['clinical_indication'] ?? null,
                    'clinical_history' => $service['clinical_history'] ?? null,
                    'contrast_required' => $service['contrast_required'] ?? false,
                    'notes' => $service['notes'] ?? null,
                ];
            }

            // Check admission if provided
            $admission = null;
            $isAdmitted = false;
            $admissionId = null;

            if ($admissionNumber) {
                $admission = Admission::where('admission_number', $admissionNumber)
                    ->where('patient_id', $patientId)
                    ->where('status', 'active')
                    ->first();

                if ($admission) {
                    $isAdmitted = true;
                    $admissionId = $admission->id;
                    Log::info('Admission found', ['admission_id' => $admissionId, 'admission_number' => $admissionNumber]);
                } else {
                    Log::warning('Admission not found', ['admission_number' => $admissionNumber]);
                }
            }

            // Create or get invoice
            $existingInvoice = Invoice::where(function ($query) use ($admissionNumber, $visitToken) {
                if ($admissionNumber) {
                    $query->where('admission_number', $admissionNumber);
                }
                $query->orWhere('visit_token', $visitToken);
            })
                ->where('patient_id', $patientId)
                ->whereIn('status', ['draft', 'unpaid'])
                ->first();

            if ($existingInvoice) {
                Log::info('Found existing invoice', ['invoice_id' => $existingInvoice->id]);

                $existingItems = is_string($existingInvoice->items)
                    ? json_decode($existingInvoice->items, true)
                    : ($existingInvoice->items ?? []);

                $mergedItems = array_merge($existingItems, $invoiceItems);
                $newTotal = $existingInvoice->total + $totalAmount;

                $existingInvoice->update([
                    'items' => $mergedItems,
                    'subtotal' => $newTotal,
                    'total' => $newTotal,
                    'due_amount' => $existingInvoice->due_amount + $totalAmount,
                ]);

                $invoice = $existingInvoice;
                Log::info('Updated existing invoice', ['invoice_id' => $invoice->id, 'new_total' => $newTotal]);
            } else {
                Log::info('Creating new invoice');

                $invoice = Invoice::create([
                    'invoice_number' => Invoice::generateInvoiceNumber(),
                    'visit_token' => $visitToken,
                    'patient_id' => $patient->id,
                    'user_id' => Auth::id(),
                    'admission_number' => $admissionNumber,
                    'customer_name' => $patient->name,
                    'customer_email' => $patient->email,
                    'customer_phone' => $patient->phone,
                    'subtotal' => $totalAmount,
                    'tax' => 0,
                    'discount' => 0,
                    'total' => $totalAmount,
                    'paid_amount' => 0,
                    'due_amount' => $totalAmount,
                    'currency' => 'ZMW',
                    'payment_scheme' => $paymentScheme,
                    'items' => $invoiceItems,
                    'issue_date' => now(),
                    'due_date' => now()->addDays(30),
                    'status' => 'unpaid',
                    'invoice_type' => 'imaging'
                ]);

                Log::info('Invoice created', ['invoice_id' => $invoice->id, 'invoice_number' => $invoice->invoice_number]);
            }

            // Create imaging order
            $orderNumber = ImagingOrder::generateOrderNumber();

            Log::info('Creating imaging order', [
                'order_number' => $orderNumber,
                'visit_token' => $visitToken,
                'patient_id' => $patientId,
                'invoice_id' => $invoice->id,
                'total_amount' => $totalAmount
            ]);

            $imagingOrderData = [
                'order_number' => $orderNumber,
                'visit_token' => $visitToken,
                'patient_id' => $patientId,
                'admission_id' => $admissionId,
                'admission_number' => $admissionNumber,
                'invoice_id' => $invoice->id,
                'priority' => 'routine',
                'status' => 'pending',
                'scheme' => $paymentScheme,
                'total_amount' => $totalAmount,
                'quantity' => count($services),
                'ordered_date' => now(),
                'is_admitted' => $isAdmitted,
                'ordered_by' => Auth::id(),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            Log::info('Imaging order data to insert', $imagingOrderData);

            $imagingOrder = ImagingOrder::create($imagingOrderData);

            Log::info('Imaging order created', ['imaging_order_id' => $imagingOrder->id]);

            // Create imaging order items
            foreach ($imagingOrderItems as $itemData) {
                $orderItemData = array_merge($itemData, [
                    'imaging_order_id' => $imagingOrder->id,
                    'visit_token' => $visitToken,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                Log::info('Creating imaging order item', $orderItemData);

                ImagingOrderItem::create($orderItemData);
            }

            DB::commit();

            Log::info('Transaction committed successfully', [
                'imaging_order_id' => $imagingOrder->id,
                'invoice_id' => $invoice->id,
                'items_count' => count($imagingOrderItems)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order created successfully',
                'data' => [
                    'imaging_order' => $imagingOrder->load('items'),
                    'invoice' => $invoice,
                    'total_amount' => $totalAmount,
                    'items_count' => count($services)
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create imaging order: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create imaging order: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }
    /**
     * Update order status
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,scheduled,in_progress,completed,cancelled',
            'reason' => 'required_if:status,cancelled|nullable|string',
            'findings' => 'nullable|string',
            'impression' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order = ImagingOrder::findOrFail($id);

            $updateData = ['status' => $request->status];

            switch ($request->status) {
                case 'scheduled':
                    $updateData['scheduled_date'] = now();
                    $updateData['scheduled_by'] = Auth::id();
                    break;
                case 'in_progress':
                    $updateData['performed_date'] = now();
                    $updateData['performed_by'] = Auth::id();
                    break;
                case 'completed':
                    $updateData['performed_date'] = now();
                    $updateData['performed_by'] = Auth::id();
                    $updateData['reported_date'] = now();
                    $updateData['reported_by'] = Auth::id();
                    $updateData['findings'] = $request->findings;
                    $updateData['impression'] = $request->impression;
                    break;
                case 'cancelled':
                    $updateData['cancelled_date'] = now();
                    $updateData['cancelled_by'] = Auth::id();
                    $updateData['cancelled_reason'] = $request->reason;
                    break;
            }

            $order->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Order status updated',
                'data' => $order
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to update status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status'
            ], 500);
        }
    }

    /**
     * Get orders by visit token
     */
    public function getByVisitToken($visitToken)
    {
        try {
            $orders = ImagingOrder::with(['items', 'invoice'])
                ->where('visit_token', $visitToken)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $orders
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch orders: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch orders'
            ], 500);
        }
    }

    /**
     * Cancel an order
     */
    public function cancel($id, Request $request)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $order = ImagingOrder::with('invoice')->findOrFail($id);

            $order->update([
                'status' => 'cancelled',
                'cancelled_date' => now(),
                'cancelled_by' => Auth::id(),
                'cancelled_reason' => $request->reason
            ]);

            // Update invoice if needed
            if ($order->invoice && $order->invoice->status === 'unpaid') {
                $invoice = $order->invoice;
                $newTotal = $invoice->total - $order->total_amount;

                $invoice->update([
                    'total' => max(0, $newTotal),
                    'due_amount' => max(0, $newTotal - $invoice->paid_amount),
                    'status' => $newTotal <= 0 ? 'cancelled' : $invoice->status
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order cancelled successfully'
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to cancel order: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel order'
            ], 500);
        }
    }
}
