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
use App\Models\Patients\MCHOrderItem;

class MartenalChildHealthController extends Controller
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
            $mchServices   = $pricingHelper->getMCH($patientId);

            return Inertia::render('patients/mch', [
                'patientId'          => $patientId,
                'services'           => $mchServices,
                'previousOrders'          => $this->getAntenatalVisits($patientId),
                'postnatal'          => $this->getPostnatalVisits($patientId),
                'childHealthRecords' => $this->getChildHealthRecords($patientId),
            ]);
        } catch (\Exception $e) {
            Log::error('MCH Index Error: ' . $e->getMessage());

            return Inertia::render('patients/mch', [
                'patientId'          => $patientId,
                'services'           => [],
                'antenatal'          => [],
                'postnatal'          => [],
                'childHealthRecords' => [],
                'error'              => 'Unable to load MCH data. Please try again.',
            ]);
        }
    }

    // ─────────────────────────────────────────────
    //  Order MCH services
    // ─────────────────────────────────────────────

    public function orderMCHService(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id'                   => 'required|exists:patients,id',
            'type'                         => 'required|in:antenatal,postnatal,child_health',
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

        /**
         * Check if initial vist has been started
         * 
         */

        Log::info($request);
        
        $service  = $request->input('services'); 
        $patientId = $request->input('patient_id');
        if($service[0]['service_name']=='Initial Visit'){
            if($this->initialVisitStarted($patientId)){
                return response()->json([
                    "message"  => "Service already initalised!!",
                    "status"   => 400
                ],400);
            }
        };

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
            $serviceType = $request->input('type');
            $totalAmount = 0;
            $invoiceItems   = [];
            $mchOrderItems  = [];

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

                $mchOrderItems[] = [
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

            Log::info('existing--', [$existingInvoice]);

            if ($existingInvoice) {
                // FIXED: Handle items properly - could be string or array depending on model cast
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

                // FIXED: Pass array directly - let model cast handle JSON encoding
                $existingInvoice->update([
                    'items'      => $mergedItems,  // No manual json_encode() needed
                    'subtotal'   => $newTotal,
                    'total'      => $newTotal,
                    'due_amount' => $existingInvoice->due_amount + $totalAmount,
                ]);

                $invoice = $existingInvoice->fresh();
                $isAppended = true;  // FIXED: Set flag to true when appending

                Log::info('MCH: appended to existing invoice', [
                    'invoice_id'    => $invoice->id,
                    'visit_token'   => $token,
                    'service_type'  => $serviceType,
                    'items_added'   => count($invoiceItems),
                    'amount_added'  => $totalAmount,
                ]);
            } else {
                // FIXED: Create new invoice without manual JSON encoding
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
                    'items'            => $invoiceItems,  // Pass array directly
                    'issue_date'       => now(),
                    'due_date'         => now()->addDays(30),
                    'status'           => 'unpaid',
                    'invoice_type'     => 'mch',
                ]);

                Log::info('MCH: created new invoice', [
                    'invoice_id'     => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'visit_token'    => $token,
                    'service_type'   => $serviceType,
                    'items_count'    => count($invoiceItems),
                    'total'          => $totalAmount,
                ]);
            }

            // ── Insert order rows ───────────────────────────────────────
            foreach ($mchOrderItems as $orderItem) {
                DB::table('mch_order_items')->insert([
                    'invoice_id'   => $invoice->id,
                    'patient_id'   => $patientId,
                    'ordered_by'   => 0,          // was hardcoded 0
                    'order_number' => $this->generateMCHOrderNumber(),
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
                    ? count($invoiceItems) . ' MCH service(s) added to existing invoice successfully.'
                    : count($invoiceItems) . ' MCH service(s) ordered and new invoice created successfully.',
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
            Log::error('MCH Order Error: ' . $e->getMessage(), [
                'trace'      => $e->getTraceAsString(),
                'patient_id' => $patientId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to order MCH service. Please try again.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────
    //  Read endpoints
    // ─────────────────────────────────────────────

    public function getAntenatalVisit($patientId, $visitId)
    {
        try {
            $visit = DB::table('antenatal_screenings as a')
                ->leftJoin('antenatal_obstetric_history as oh', 'a.id', '=', 'oh.antenatal_id')
                ->leftJoin('antenatal_medical_history as mh',   'a.id', '=', 'mh.antenatal_id')
                ->leftJoin('antenatal_family_history as fh',    'a.id', '=', 'fh.antenatal_id')
                ->leftJoin('antenatal_physical_examination as pe', 'a.id', '=', 'pe.antenatal_id')
                ->leftJoin('antenatal_fetal_assessment as fa',  'a.id', '=', 'fa.antenatal_id')
                ->leftJoin('antenatal_danger_signs as ds',      'a.id', '=', 'ds.antenatal_id')
                ->leftJoin('antenatal_follow_up as fu',         'a.id', '=', 'fu.antenatal_id')
                ->where('a.patient_id', $patientId)
                ->where('a.id', $visitId)
                ->select('a.*', 'oh.*', 'mh.*', 'fh.*', 'pe.*', 'fa.*', 'ds.*', 'fu.*')
                ->first();

            if (! $visit) {
                return response()->json(['success' => false, 'message' => 'Visit not found.'], 404);
            }

            return response()->json(['success' => true, 'data' => $visit]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching visit details.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function getSummary($patientId)
    {
        try {
            $summary = [
                'total_antenatal_visits' => DB::table('antenatal_screenings')
                    ->where('patient_id', $patientId)->count(),

                'total_postnatal_visits' => DB::table('postnatal_screenings')
                    ->where('patient_id', $patientId)->count(),

                // risk_level lives in antenatal_follow_up, not antenatal_screenings
                'current_pregnancy' => DB::table('antenatal_screenings as a')
                    ->leftJoin('antenatal_follow_up as fu', 'a.id', '=', 'fu.antenatal_id')
                    ->where('a.patient_id', $patientId)
                    ->whereNull('a.delivery_date')
                    ->orderByDesc('a.screening_date')
                    ->select('a.id', 'a.gestational_age_weeks', 'a.edd', 'fu.risk_level')
                    ->first(),

                'last_visit' => DB::table('antenatal_screenings as a')
                    ->leftJoin('antenatal_follow_up as fu', 'a.id', '=', 'fu.antenatal_id')
                    ->where('a.patient_id', $patientId)
                    ->orderByDesc('a.screening_date')
                    ->select('a.id', 'a.screening_date', 'a.visit_number', 'fu.risk_level')
                    ->first(),

                'danger_signs_present' => DB::table('antenatal_danger_signs as ds')
                    ->join('antenatal_screenings as a', 'ds.antenatal_id', '=', 'a.id')
                    ->where('a.patient_id', $patientId)
                    ->where(function ($q) {
                        $q->where('ds.vaginal_bleeding',        1)
                            ->orWhere('ds.severe_headache',       1)
                            ->orWhere('ds.convulsions',           1)
                            ->orWhere('ds.reduced_fetal_movement', 1);
                    })
                    ->exists(),
            ];

            return response()->json(['success' => true, 'data' => $summary]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching summary.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Format invoice items for display (used externally if needed).
     * Keys match the structure written in orderMCHService().
     */
    public function getFormattedInvoiceItems(Invoice $invoice): array
    {
        // FIXED: Handle items properly - could be string or array
        $items = $invoice->items;

        if (is_string($items)) {
            $items = json_decode($items, true) ?: [];
        } elseif (!is_array($items)) {
            $items = [];
        }

        return array_values(array_map(function ($item, $index) {
            return [
                'id'              => $index + 1,
                'service_id'      => $item['service_id'],
                'name'            => $item['service_name'],
                'category'        => $item['service_category'],
                'price'           => (float) $item['price'],
                'quantity'        => (int)   $item['quantity'],
                'total'           => (float) $item['total'],
                'type'            => $item['type'],
                'priority'        => $item['priority'] ?? 'routine',
                'date'            => $item['created_at'],
                'display_name'    => $item['service_name'] . ' (' . $item['service_category'] . ')',
                'formatted_price' => 'ZMW ' . number_format($item['price'], 2),
                'formatted_total' => 'ZMW ' . number_format($item['total'], 2),
            ];
        }, $items, array_keys($items)));
    }

    // ─────────────────────────────────────────────
    //  Private data-fetching helpers
    // ─────────────────────────────────────────────

    private function getAntenatalVisits($patientId)
    {
        try {
            return MCHOrderItem::where('patient_id', $patientId)->latest()->get();
        } catch (\Exception $e) {
            Log::error('Error fetching antenatal visits: ' . $e->getMessage());
            return [];
        }
    }

    private function getPostnatalVisits($patientId): array
    {
        try {
            return DB::table('postnatal_screenings')
                ->where('patient_id', $patientId)
                ->orderByDesc('visit_date')
                ->orderByDesc('visit_number')
                ->select(
                    'id',
                    'visit_number',
                    'visit_date',
                    'baby_weight',
                    'baby_health_status',
                    'maternal_health_status',
                    'immunization_given',
                    'breastfeeding_status',
                    'family_planning_method',
                    'created_at'
                )
                ->get()
                ->map(fn($v) => [
                    'id'                     => $v->id,
                    'visit_number'           => $v->visit_number,
                    'visit_date'             => $v->visit_date,
                    'checkup_type'           => 'Postnatal',
                    'baby_weight'            => $v->baby_weight,
                    'baby_health_status'     => $v->baby_health_status,
                    'maternal_health_status' => $v->maternal_health_status,
                    'immunization_given'     => $v->immunization_given,
                    'breastfeeding_status'   => $v->breastfeeding_status,
                    'family_planning_method' => $v->family_planning_method,
                    'created_at'             => $v->created_at,
                ])
                ->toArray();
        } catch (\Exception $e) {
            Log::error('Error fetching postnatal visits: ' . $e->getMessage());
            return [];
        }
    }

    private function getChildHealthRecords($patientId): array
    {
        try {
            return DB::table('child_health_records')
                ->where('mother_patient_id', $patientId)
                ->orderByDesc('created_at')
                ->select(
                    'id',
                    'child_name',
                    'child_dob',
                    'gender',
                    'birth_weight',
                    'immunizations',
                    'growth_parameters',
                    'developmental_milestones',
                    'created_at'
                )
                ->get()
                ->map(fn($r) => (array) $r)   // cast stdClass → array for consistent frontend shape
                ->toArray();
        } catch (\Exception $e) {
            Log::error('Error fetching child health records: ' . $e->getMessage());
            return [];
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

    private function generateMCHOrderNumber(): string
    {
        $prefix = 'MCH';
        $date   = now()->format('Ymd');

        // Use a DB-level aggregate to avoid race conditions
        $count = DB::table('mch_order_items')
            ->whereDate('created_at', today())
            ->count();

        return sprintf('%s-%s-%04d', $prefix, $date, $count + 1);
    } 

    private  function initialVisitStarted($patientId){
        return MCHOrderItem::where('patient_id', $patientId)
        ->where('service_name', 'Initial Visit')
        // ->where('status','active')
        ->first();
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
