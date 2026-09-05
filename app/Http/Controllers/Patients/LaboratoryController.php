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
use App\Models\Patients\PatientVisitScheme;
use Illuminate\Support\Facades\Str;

class LaboratoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(int $patientId)
    {
        try {
            // Get active visit token for payment scheme
            $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
            $paymentMethod = $activeToken['payment_method'] ?? 'cash';

            // Get laboratory services with correct pricing
            $pricingHelper = new ServicePricingHelper($paymentMethod);
            $schemeSelected = PatientVisitScheme::where('token', $activeToken['token'])
                ->value('scheme_id');
            $laboratoryServices =  Service::where('scheme_type', $schemeSelected)
                ->where('service_category','Laboratory')
                ->get();

                // Get previous laboratory orders - GROUPED and DISTINCT
                $previousOrders = $this->getGroupedPreviousOrders($patientId);

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
                'error' => 'Unable to load laboratory data. Error: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Get grouped previous orders - DISTINCT by order_number or grouped by order
     */
    private function getGroupedPreviousOrders($patientId)
    {
        $orders = [];

        // Try to get from lab_order table first (more complete)
        if (DB::getSchemaBuilder()->hasTable('lab_order')) {
            $labOrders = DB::table('lab_order')
                ->where('patient_id', $patientId)
                ->orderByDesc('created_at')
                ->get();

            // Group by order_number if available, otherwise by id
            $grouped = [];
            foreach ($labOrders as $order) {
                $key = $order->order_number ?? $order->id;
                if (!isset($grouped[$key])) {
                    $grouped[$key] = $order;
                }
            }

            // Convert back to array
            $orders = array_values($grouped);
        }

        // If no orders found, try LabOrderItem
        if (empty($orders)) {
            $labOrderItems = \App\Models\Patients\LabOrderItem::where('patient_id', $patientId)
                ->latest()
                ->get();

            // Group by order_number or invoice_id
            $grouped = [];
            foreach ($labOrderItems as $item) {
                $key = $item->order_number ?? $item->invoice_id ?? $item->id;
                if (!isset($grouped[$key])) {
                    $grouped[$key] = (object) [
                        'id' => $item->id,
                        'order_number' => $item->order_number ?? 'LAB-' . random(8),
                        'service_name' => $item->service_name ?? 'Laboratory Test',
                        'service_category' => $item->service_category ?? 'Laboratory',
                        'quantity' => $item->quantity ?? 1,
                        'unit_price' => $item->unit_price ?? 0,
                        'total_price' => $item->total_price ?? 0,
                        'status' => $item->status ?? 'pending',
                        'priority' => $item->priority ?? 'routine',
                        'created_at' => $item->created_at ?? now(),
                        'result_value' => $item->result_value ?? null,
                        'performed_by' => $item->performed_by ?? null,
                        'result_date' => $item->result_date ?? null,
                    ];
                } else {
                    // Aggregate quantities if same order
                    $grouped[$key]->quantity += ($item->quantity ?? 1);
                    $grouped[$key]->total_price += ($item->total_price ?? 0);
                    // Append service name if multiple
                    if ($grouped[$key]->service_name !== $item->service_name) {
                        $grouped[$key]->service_name .= ', ' . ($item->service_name ?? '');
                    }
                }
            }

            $orders = array_values($grouped);
        }

        return collect($orders);
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
            $orderNumber = $this->generateLaboratoryOrderNumber();

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
                    'order_number' => $orderNumber, // Same order number for all items
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
                        'test_name' => $orderItem['service_name'],
                        'patient_id' => $patientId,
                        'ordered_by' => Auth::id(),
                        'order_number' => $orderNumber,
                        'status' => 'pending',
                        'created_at' => now(),
                        'updated_at' => now(),
                        'quantity' => $orderItem['quantity'],
                        'unit_price' => $orderItem['unit_price'],
                        'total_price' => $orderItem['total_price'],
                        'service_category' => $orderItem['service_category'],
                        'priority' => $orderItem['priority'],
                        'notes' => $orderItem['notes'] ?? null,
                    ]);
                }
            }

            // Also store in LabOrderItem if table exists
            if (DB::getSchemaBuilder()->hasTable('lab_order_items')) {
                foreach ($laboratoryOrderItems as $orderItem) {
                    DB::table('lab_order_items')->insert([
                        'patient_id' => $patientId,
                        'invoice_id' => $invoice->id,
                        'service_id' => $orderItem['service_id'],
                        'service_name' => $orderItem['service_name'],
                        'service_category' => $orderItem['service_category'],
                        'service_type' => $orderItem['service_type'],
                        'quantity' => $orderItem['quantity'],
                        'unit_price' => $orderItem['unit_price'],
                        'total_price' => $orderItem['total_price'],
                        'priority' => $orderItem['priority'],
                        'notes' => $orderItem['notes'] ?? null,
                        'order_number' => $orderNumber,
                        'status' => 'pending',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            } else {
                Log::warning('lab_order_items table does not exist');
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
                    'order_number' => $orderNumber,
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
            // Update in lab_order table
            if (DB::getSchemaBuilder()->hasTable('lab_order')) {
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
            }

            // Also update in lab_order_items if exists
            if (DB::getSchemaBuilder()->hasTable('lab_order_items')) {
                DB::table('lab_order_items')
                    ->where('id', $testOrderId)
                    ->update([
                        'result_value' => $request->result_value,
                        'remarks' => $request->remarks,
                        'performed_by' => $request->performed_by ?? Auth::user()?->name,
                        'result_date' => $request->result_date ?? now(),
                        'status' => 'completed',
                        'updated_at' => now(),
                    ]);
            }

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
        $sequence = 1;

        // Check in lab_order table
        if (DB::getSchemaBuilder()->hasTable('lab_order')) {
            $lastOrder = DB::table('lab_order')
                ->where('order_number', 'like', "LAB-{$date}-%")
                ->orderByDesc('id')
                ->first();

            if ($lastOrder) {
                $lastSequence = (int) substr($lastOrder->order_number, -4);
                $sequence = $lastSequence + 1;
            }
        }

        // Also check in lab_order_items if lab_order doesn't have the order
        if ($sequence === 1 && DB::getSchemaBuilder()->hasTable('lab_order_items')) {
            $lastItem = DB::table('lab_order_items')
                ->where('order_number', 'like', "LAB-{$date}-%")
                ->orderByDesc('id')
                ->first();

            if ($lastItem) {
                $lastSequence = (int) substr($lastItem->order_number, -4);
                $sequence = max($sequence, $lastSequence + 1);
            }
        }

        return sprintf('LAB-%s-%04d', $date, $sequence);
    }
}
