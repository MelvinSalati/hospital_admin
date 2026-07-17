<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Helpers\VisitTokenHelper;
use App\Helpers\ServicePricingHelper;
use Illuminate\Support\Facades\Log;
use App\Models\Patients\Patient;
use App\Models\Services\Service;
use App\Models\Payments\Invoice;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Str; 

class LaboratoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index($patientId)
    {
        try {
            // Get active visit token for payment scheme
            $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
            $paymentMethod = $activeToken['payment_method'] ?? 'cash';

            // Get laboratory services with correct pricing
            $pricingHelper = new ServicePricingHelper($paymentMethod);
            $laboratoryServices = $pricingHelper->getLaboratory($patientId);

            // Get previous laboratory orders from the correct table
            // Check if table exists first
            $previousOrders = \App\Models\Patients\LabOrder::where('patient_id', $patientId)
                ->latest()
                ->get();
            // Get pending test orders
            $pendingTestOrders = [];
            if (DB::getSchemaBuilder()->hasTable('lab_order')) {
                $pendingTestOrders = DB::table('lab_order')
                    ->where('status', 'pending')
                    ->where('patient_id', $patientId)
                    ->orderByDesc('created_at')
                    ->get();
            }

            // Get completed test orders
            $completedTestOrders = [];
            if (DB::getSchemaBuilder()->hasTable('lab_order')) {
                $completedTestOrders = DB::table('lab_order')
                    ->where('status', 'completed')
                    ->where('patient_id', $patientId)
                    ->orderByDesc('created_at')
                    ->get();
            }

            return Inertia::render('patients/laboratory', [
                'patientId' => $patientId,
                'services' => $laboratoryServices,
                'previousOrders' => $previousOrders,
            ]);
        } catch (\Exception $e) {
            Log::error('Laboratory Index Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'patient_id' => $patientId
            ]);

            return Inertia::render('patients/laboratory', [
                'patientId' => $patientId,
                'services' => collect(),
                'previousOrders' => collect(),
                'pending_test_orders' => collect(),
                'completed_test_orders' => collect(),
                'error' => 'Unable to load laboratory data. Error: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Store laboratory orders.
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
            $laboratoryOrderItems = [];

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

                $laboratoryOrderItems[] = [
                    'service_id' => $service['id'],
                    'service_name' => $service['service_name'],
                    'service_category' => $service['service_category'],
                    'service_type' => $serviceType,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'priority' => $priority,
                    'notes' => $service['notes'] ?? null,
                    'ordered_at' => now(),
                    'visit_token' => $token,
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

            // Insert laboratory order items - check if table exists
            if (DB::getSchemaBuilder()->hasTable('lab_order')) {
                foreach ($laboratoryOrderItems as $orderItem) {
                    DB::table('lab_order')->insert([
                        'invoice_id' => $invoice->id,
                        'test_name'  => $request->input('service_name'),
                        'patient_id' => $patientId,
                        'ordered_by' => Auth::id(),
                        'order_number' => $this->generateLaboratoryOrderNumber(),
                        'status' => 'pending',
                        'created_at' => now(),
                        'updated_at' => now(),
                        ...$orderItem,
                    ]);
                }
            } else {
                Log::warning('lab_order table does not exist');
            }

            DB::commit();

            $returnItems = array_map(fn($item) => [
                'id' => $item['service_id'],
                'name' => $item['service_name'],
                'price' => $item['price'],
                'quantity' => $item['quantity'],
                'total' => $item['total'],
                'category' => $item['service_category'],
                'type' => $item['type'],
                'priority' => $item['priority'],
                'date' => $item['created_at'],
            ], $invoiceItems);

            return response()->json([
                'success' => true,
                'message' => $isAppended
                    ? count($invoiceItems) . ' laboratory test(s) added to existing invoice successfully.'
                    : count($invoiceItems) . ' laboratory test(s) ordered and new invoice created successfully.',
                'data' => [
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
     * Update test results
     */
    public function updateResults(Request $request, $testOrderId)
    {
        $validator = Validator::make($request->all(), [
            'result_value' => 'required|string',
            'remarks' => 'nullable|string',
            'performed_by' => 'nullable|string',
            'result_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::table('lab_order')
                ->where('id', $testOrderId)
                ->update([
                    'result_value' => $request->result_value,
                    'remarks' => $request->remarks,
                    'performed_by' => $request->performed_by ?? Auth::user()?->name,
                    'result_date' => $request->result_date ?? now(),
                    'status' => 'completed',
                    'updated_at' => now(),
                ]);

            Log::info('Laboratory results updated', ['test_order_id' => $testOrderId]);

            return response()->json([
                'success' => true,
                'message' => 'Test results saved successfully.',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating lab results: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to save results. Please try again.',
            ], 500);
        }
    }

    /**
     * Get price by payment scheme
     */
    private function getPriceByScheme(Service $service, string $scheme): ?float
    {
        $price = match ($scheme) {
            'nhima' => $service->nhima_price,
            'insurance' => $service->insurance_price,
            'charity' => $service->charity_price,
            default => $service->cash_price,
        };

        return $price ? (float) $price : null;
    }

    /**
     * Generate unique laboratory order number
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
            $date."".rand(000,999),
            $lastSequence + 1
        );
    }
}
