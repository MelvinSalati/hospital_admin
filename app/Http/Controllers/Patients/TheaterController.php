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

class TheaterController extends Controller
{
    // ─────────────────────────────────────────────
    //  Index / dashboard
    // ─────────────────────────────────────────────

    public function index($patientId)
    {
        try {
            $activeToken   = VisitTokenHelper::getActiveTokenArray($patientId);
            $paymentMethod = $activeToken['payment_method'] ?? 'cash';

            $pricingHelper = new ServicePricingHelper($paymentMethod);
            $theaterServices = $pricingHelper->getProcedures($patientId);

            // Get previous theater/procedure orders
            $previousOrders = DB::table('theater_order_items')
                ->where('patient_id', $patientId)
                ->orderByDesc('created_at')
                ->select(
                    'id',
                    'order_number',
                    'service_name',
                    'service_category',
                    'quantity',
                    'unit_price',
                    'total_price',
                    'status',
                    'priority',
                    'created_at'
                )
                ->get();

            return Inertia::render('patients/theater', [
                'patientId'      => $patientId,
                'services'       => $theaterServices,
                'previousOrders' => $previousOrders,
            ]);
        } catch (\Exception $e) {
            Log::error('Theater Index Error: ' . $e->getMessage());

            return Inertia::render('patients/theater', [
                'patientId'      => $patientId,
                'services'       => collect(),
                'previousOrders' => collect(),
                'error'          => 'Unable to load theater procedures. Please try again.',
            ]);
        }
    }

    // ─────────────────────────────────────────────
    //  Order Theater/Procedure services
    // ─────────────────────────────────────────────

    public function orderTheaterServices(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id'                   => 'required|exists:patients,id',
            'services'                     => 'required|array|min:1',
            'services.*.id'                => 'required|exists:services,id',
            'services.*.service_name'      => 'required|string',
            'services.*.service_category'  => 'required|string',
            'services.*.price'             => 'required|numeric|min:0',
            'services.*.quantity'          => 'sometimes|integer|min:1',
            'services.*.priority'          => 'sometimes|in:routine,urgent,stat',
            'services.*.notes'             => 'nullable|string',
            'scheme'                       => 'sometimes|in:cash,nhima,insurance,charity,mobile_money',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 422,
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $patientId   = $request->input('patient_id');
        $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
        $token       = $activeToken['token'] ?? null;

        if (! $token) {
            return response()->json([
                'status'  => 400,
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
            $patient     = Patient::findOrFail($patientId);
            $serviceType = 'theater';
            $totalAmount = 0;
            $invoiceItems   = [];
            $theaterOrderItems = [];

            foreach ($request->input('services') as $service) {
                $serviceRecord = Service::find($service['id']);

                if (! $serviceRecord) {
                    throw new \Exception("Service not found: {$service['service_name']}");
                }

                $quantity  = (int) ($service['quantity'] ?? 1);
                $priority  = $service['priority'] ?? 'routine';
                $unitPrice = $this->getPriceByScheme($serviceRecord, $paymentMethod);

                // Allow the frontend to override with a custom price
                if (isset($service['price']) && (float) $service['price'] > 0) {
                    $unitPrice = (float) $service['price'];
                }

                if (! $unitPrice || $unitPrice <= 0) {
                    throw new \Exception(
                        "No valid price for \"{$serviceRecord->service_name}\" under scheme \"{$paymentMethod}\"."
                    );
                }

                $totalPrice   = $unitPrice * $quantity;
                $totalAmount += $totalPrice;

                $invoiceItems[] = [
                    'service_id'       => $service['id'],
                    'service_name'     => $service['service_name'],
                    'service_category' => $service['service_category'],
                    'price'            => $unitPrice,
                    'quantity'         => $quantity,
                    'total'            => $totalPrice,
                    'type'             => $serviceType,
                    'priority'         => $priority,
                    'created_at'       => now()->toDateTimeString(),
                ];

                $theaterOrderItems[] = [
                    'service_id'       => $service['id'],
                    'service_name'     => $service['service_name'],
                    'service_category' => $service['service_category'],
                    'service_type'     => $serviceType,
                    'quantity'         => $quantity,
                    'unit_price'       => $unitPrice,
                    'total_price'      => $totalPrice,
                    'priority'         => $priority,
                    'notes'            => $service['notes']           ?? null,
                    'collection_date'  => $service['collection_date'] ?? null,
                    'ordered_at'       => now(),
                    'visit_token'      => $token,
                ];
            }

            // ── Find or create invoice ───────────────────────────────────
            $existingInvoice = Invoice::where('visit_token', $token)
                ->whereIn('status', ['draft', 'unpaid'])
                ->where('patient_id', $patientId)
                ->first();

            $isAppended = false;

            if ($existingInvoice) {
                // Handle items properly - could be string or array depending on model cast
                $existingItems = $existingInvoice->items;

                // Parse existing items if they're a string, otherwise use as array
                if (is_string($existingItems)) {
                    $parsedExisting = json_decode($existingItems, true) ?: [];
                } elseif (is_array($existingItems)) {
                    $parsedExisting = $existingItems;
                } else {
                    $parsedExisting = [];
                }

                // Merge new items with existing
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

                Log::info('Theater: appended to existing invoice', [
                    'invoice_id'    => $invoice->id,
                    'visit_token'   => $token,
                    'service_type'  => $serviceType,
                    'items_added'   => count($invoiceItems),
                    'amount_added'  => $totalAmount,
                ]);
            } else {
                // Create new invoice
                $invoice = Invoice::create([
                    'invoice_number'   => Invoice::generateInvoiceNumber(),
                    'patient_id'       => $patient->id,
                    'user_id'          => Auth::id(),
                    'visit_token'      => $token,
                    'customer_name'    => $patient->name,
                    'customer_email'   => $patient->email ?? null,
                    'customer_phone'   => $patient->phone ?? null,
                    'customer_address' => $patient->address ?? null,
                    'subtotal'         => $totalAmount,
                    'tax'              => 0,
                    'discount'         => 0,
                    'total'            => $totalAmount,
                    'paid_amount'      => 0,
                    'due_amount'       => $totalAmount,
                    'currency'         => 'ZMW',
                    'payment_scheme'   => $paymentMethod,
                    'items'            => $invoiceItems,
                    'issue_date'       => now(),
                    'due_date'         => now()->addDays(30),
                    'status'           => 'unpaid',
                    'invoice_type'     => 'theater',
                ]);

                Log::info('Theater: created new invoice', [
                    'invoice_id'     => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'visit_token'    => $token,
                    'service_type'   => $serviceType,
                    'items_count'    => count($invoiceItems),
                    'total'          => $totalAmount,
                ]);
            }

            // ── Insert order rows ───────────────────────────────────────
            foreach ($theaterOrderItems as $orderItem) {
                DB::table('theater_order_items')->insert([
                    'invoice_id'   => $invoice->id,
                    'patient_id'   => $patientId,
                    'ordered_by'   => Auth::id(),
                    'order_number' => $this->generateTheaterOrderNumber(),
                    'status'       => 'pending',
                    'created_at'   => now(),
                    'updated_at'   => now(),
                    ...$orderItem,
                ]);
            }

            DB::commit();

            $returnItems = array_map(fn($item) => [
                'id'       => $item['service_id'],
                'name'     => $item['service_name'],
                'price'    => $item['price'],
                'quantity' => $item['quantity'],
                'total'    => $item['total'],
                'category' => $item['service_category'],
                'type'     => $item['type'],
                'priority' => $item['priority'],
                'date'     => $item['created_at'],
            ], $invoiceItems);

            return response()->json([
                'success' => true,
                'message' => $isAppended
                    ? count($invoiceItems) . ' theater procedure(s) added to existing invoice successfully.'
                    : count($invoiceItems) . ' theater procedure(s) ordered and new invoice created successfully.',
                'data' => [
                    'invoice' => [
                        'id'             => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'total'          => $invoice->total,
                        'status'         => $invoice->status,
                        'payment_scheme' => $invoice->payment_scheme,
                    ],
                    'order_items'  => $returnItems,
                    'is_appended'  => $isAppended,
                    'total_amount' => $totalAmount,
                    'service_type' => $serviceType,
                    'items_count'  => count($invoiceItems),
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Theater Order Error: ' . $e->getMessage(), [
                'trace'      => $e->getTraceAsString(),
                'patient_id' => $patientId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to order theater procedure. Please try again.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────
    //  Private utilities
    // ─────────────────────────────────────────────

    private function getPriceByScheme(Service $service, string $scheme): ?float
    {
        $price = match ($scheme) {
            'nhima'     => $service->nhima_price,
            'insurance' => $service->insurance_price,
            'charity'   => $service->charity_price,
            default     => $service->cash_price,
        };

        return $price ? (float) $price : null;
    }

    private function generateTheaterOrderNumber(): string
    {
        $prefix = 'THT';
        $date   = now()->format('Ymd');

        $count = DB::table('theater_order_items')
            ->whereDate('created_at', today())
            ->count();

        return sprintf('%s-%s-%04d', $prefix, $date, $count + 1);
    }

    // ─────────────────────────────────────────────
    //  Boilerplate stubs (resource controller)
    // ─────────────────────────────────────────────

    public function create() {}
    public function store(Request $request) {}
    public function show(string $id) {}
    public function edit(string $id) {}
    public function update(Request $request, string $id) {}
    public function destroy(string $id) {}
}
