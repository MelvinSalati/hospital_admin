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

class TheaterController extends Controller
{
    // ─────────────────────────────────────────────
    //  Index / dashboard
    // ─────────────────────────────────────────────

    public function index($patientId)
    {
        try {
            // Get active visit token for payment scheme
            $activeToken   = VisitTokenHelper::getActiveTokenArray($patientId);
            $paymentMethod = $activeToken['payment_method'] ?? 'cash';

            // ── Resolve scheme_id from the active visit token (same as LaboratoryController) ──
            $schemeSelected = PatientVisitScheme::where('token', $activeToken['token'])
                ->value('scheme_id');

            // ── Load theater services filtered by scheme_type, exactly like laboratory ──
            $theaterServices = Service::where('scheme_type', $schemeSelected)
                ->whereIn('service_category', ['Theater', 'Theatre', 'Surgery', 'Procedures'])
                ->get();

            // Optional: keep pricing helper available for any downstream formatting
            $pricingHelper = new ServicePricingHelper($paymentMethod);

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
            Log::error('Theater Index Error: ' . $e->getMessage(), [
                'trace'      => $e->getTraceAsString(),
                'patient_id' => $patientId,
            ]);

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
            $invoiceItems      = [];
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

                if (is_string($existingItems)) {
                    $parsedExisting = json_decode($existingItems, true) ?: [];
                } elseif (is_array($existingItems)) {
                    $parsedExisting = $existingItems;
                } else {
                    $parsedExisting = [];
                }

                // Merge new items with existing
                $mergedItems = array_merge($parsedExisting, $invoiceItems);
                $newTotal    = $existingInvoice->total + $totalAmount;

                $existingInvoice->update([
                    'items'      => $mergedItems,
                    'subtotal'   => $newTotal,
                    'total'      => $newTotal,
                    'due_amount' => $existingInvoice->due_amount + $totalAmount,
                ]);

                $invoice    = $existingInvoice->fresh();
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


    public function storeOperativeNote(Request $request)
    {
        $validator = Validator::make($request->all(), $this->noteRules($request->input('action') === 'sign'));

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $orderItemId = (int) $request->input('theater_order_item_id');

        $orderItem = DB::table('theater_order_items')->where('id', $orderItemId)->first();
        if (!$orderItem) {
            return response()->json(['message' => 'Theater order item not found.'], 404);
        }

        //
        $update = 
        DB::table('theater_order_items')->where('id', $orderItemId)->update([
            'status' => 'Completed'
        ]);

        // One note per order item
        $exists = DB::table('operative_notes')
            ->where('theater_order_item_id', $orderItemId)
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'An operative note already exists for this procedure.'], 422);
        }

        $action   = $request->input('action', 'draft'); // draft | sign
        $now      = now();
        $userId   = Auth::id();

        $data = $this->mapNotePayload($request, $orderItem, $action, $userId, $now);

        try {
            $id = DB::table('operative_notes')->insertGetId($data);

            $note = DB::table('operative_notes')->where('id', $id)->first();

            return response()->json([
                'message' => $action === 'sign' ? 'Operative note signed.' : 'Draft saved.',
                'note'    => [
                    'id'        => $note->id,
                    'status'    => $note->status,
                    'signed_at' => $note->signed_at,
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Operative note store failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to save the operative note.'], 500);
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

    // public function storeOperativeNote(Request $request)
    // {
    //     $validator = Validator::make(
    //         $request->all(),
    //         $this->noteRules($request->input('action') === 'sign')
    //     );

    //     if ($validator->fails()) {
    //         return response()->json([
    //             'message' => 'Validation failed',
    //             'errors'  => $validator->errors(),
    //         ], 422);
    //     }

    //     $orderItemId = (int) $request->input('theater_order_item_id');

    //     $orderItem = DB::table('theater_order_items')->where('id', $orderItemId)->first();
    //     if (! $orderItem) {
    //         return response()->json(['message' => 'Theater order item not found.'], 404);
    //     }

    //     $exists = DB::table('operative_notes')
    //         ->where('theater_order_item_id', $orderItemId)
    //         ->whereNull('deleted_at')
    //         ->exists();

    //     if ($exists) {
    //         return response()->json([
    //             'message' => 'An operative note already exists for this procedure.',
    //         ], 422);
    //     }

    //     $action = $request->input('action', 'draft');
    //     $now    = now();
    //     $userId = Auth::id();

    //     $data = $this->mapNotePayload($request, $orderItem, $action, $userId, $now);

    //     try {
    //         $id = DB::table('operative_notes')->insertGetId($data);

    //         $note = DB::table('operative_notes')->where('id', $id)->first();

    //         return response()->json([
    //             'message' => $action === 'sign' ? 'Operative note signed.' : 'Draft saved.',
    //             'note'    => [
    //                 'id'        => $note->id,
    //                 'status'    => $note->status,
    //                 'signed_at' => $note->signed_at,
    //             ],
    //         ], 201);
    //     } catch (\Exception $e) {
    //         Log::error('Operative note store failed', ['error' => $e->getMessage()]);
    //         return response()->json(['message' => 'Failed to save the operative note.'], 500);
    //     }
    // }

    // ─────────────────────────────────────────────
    //  Operative Notes – UPDATE (draft or sign)
    // ─────────────────────────────────────────────

    public function updateOperativeNote(Request $request, $id)
    {
        $note = DB::table('operative_notes')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (! $note) {
            return response()->json(['message' => 'Operative note not found.'], 404);
        }

        if ($note->status === 'signed') {
            return response()->json(['message' => 'Signed notes cannot be edited.'], 403);
        }

        $validator = Validator::make(
            $request->all(),
            $this->noteRules($request->input('action') === 'sign')
        );

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $orderItem = DB::table('theater_order_items')
            ->where('id', $note->theater_order_item_id)
            ->first();

        $action = $request->input('action', 'draft');
        $now    = now();
        $userId = Auth::id();

        $data = $this->mapNotePayload($request, $orderItem, $action, $userId, $now);

        // Protect immutable columns
        unset(
            $data['theater_order_item_id'],
            $data['patient_id'],
            $data['patient_visit_id'],
            $data['created_by'],
            $data['created_at']
        );

        try {
            DB::table('operative_notes')->where('id', $id)->update($data);

            $updated = DB::table('operative_notes')->where('id', $id)->first();

            return response()->json([
                'message' => $action === 'sign' ? 'Operative note signed.' : 'Draft saved.',
                'note'    => [
                    'id'        => $updated->id,
                    'status'    => $updated->status,
                    'signed_at' => $updated->signed_at,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Operative note update failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to save the operative note.'], 500);
        }
    }

    // ─────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────




    private function noteRules(bool $signing = false): array
    {
        $required = $signing ? 'required' : 'nullable';

        return [
            'theater_order_item_id'       => 'required|integer|exists:theater_order_items,id',
            'operation_date'              => "$required|date",
            'start_time'                  => "$required|date_format:H:i",
            'end_time'                    => "$required|date_format:H:i",
            'theatre'                     => 'nullable|string|max:255',
            'preoperative_diagnosis'      => "$required|string",
            'postoperative_diagnosis'     => "$required|string",
            'procedure_performed'         => "$required|string",
            'anaesthesia_type'            => "$required|string|max:255",
            'procedure_details'           => "$required|string",
            'findings'                    => "$required|string",
            'ebl_ml'                      => "$required|integer|min:0",
            'fluids_ml'                   => 'nullable|integer|min:0',
            'urine_output_ml'             => 'nullable|integer|min:0',
            'counts_correct'              => "$required|in:correct,incorrect,not_applicable",
            'specimens'                   => 'nullable|array',
            'specimens.*.description'     => 'nullable|string',
            'specimens.*.destination'     => 'nullable|string',
            'complications_occurred'      => 'boolean',
            'complications'               => 'required_if:complications_occurred,true|nullable|string',
            'post_op_plan'                => 'nullable|array',
            'post_op_plan.monitoring'     => "$required|string",
            'post_op_plan.medications'    => "$required|string",
            'post_op_plan.activity'       => 'nullable|string',
            'post_op_plan.diet'           => 'nullable|string',
            'post_op_plan.iv_fluids'      => 'nullable|string',
            'post_op_plan.drains_dressings' => 'nullable|string',
            'registration_number'         => "$required|string|max:255",
            'action'                      => 'required|in:draft,sign',
        ];
    }

    private function mapNotePayload(Request $request, $orderItem, string $action, $userId, $now): array
    {
        $signing = $action === 'sign';

        return [
            'theater_order_item_id'   => $orderItem->id,
            'patient_id'              => $orderItem->patient_id,
            'patient_visit_id'        => $orderItem->patient_visit_id ?? null,
            'operation_date'          => $request->input('operation_date'),
            'start_time'              => $request->input('start_time'),
            'end_time'                => $request->input('end_time'),
            'theatre'                 => $request->input('theatre'),
            'preoperative_diagnosis'  => $request->input('preoperative_diagnosis'),
            'postoperative_diagnosis' => $request->input('postoperative_diagnosis'),
            'procedure_performed'     => $request->input('procedure_performed'),
            'anaesthesia_type'        => $request->input('anaesthesia_type'),
            'procedure_details'       => $request->input('procedure_details'),
            'findings'                => $request->input('findings'),
            'ebl_ml'                  => $request->input('ebl_ml'),
            'fluids_ml'               => $request->input('fluids_ml'),
            'urine_output_ml'         => $request->input('urine_output_ml'),
            'counts_correct'          => $request->input('counts_correct'),
            'specimens'               => json_encode($request->input('specimens', [])),
            'complications_occurred'  => (bool) $request->input('complications_occurred', false),
            'complications'           => $request->input('complications'),
            'post_op_plan'            => json_encode($request->input('post_op_plan', [])),
            'status'                  => $signing ? 'signed' : 'draft',
            'registration_number'     => $request->input('registration_number'),
            'signed_by'               => $signing ? $userId : null,
            'signed_at'               => $signing ? $now : null,
            'created_by'              => $userId,
            'created_at'              => $now,
            'updated_at'              => $now,
        ];
    }

    private function noteToFormArray($n): array
    {
        return [
            'operation_date'          => $n->operation_date,
            'start_time'              => $n->start_time ? substr($n->start_time, 0, 5) : null,
            'end_time'                => $n->end_time ? substr($n->end_time, 0, 5) : null,
            'theatre'                 => $n->theatre,
            'lead_surgeon_id'         => $n->lead_surgeon_id,
            'anaesthetist_id'         => $n->anaesthetist_id,
            'scrub_nurse_id'          => $n->scrub_nurse_id,
            'circulating_nurse_id'    => $n->circulating_nurse_id,
            'co_surgeon_ids'          => json_decode($n->co_surgeon_ids ?? '[]', true) ?: [],
            'assistant_ids'           => json_decode($n->assistant_ids ?? '[]', true) ?: [],
            'preoperative_diagnosis'  => $n->preoperative_diagnosis,
            'postoperative_diagnosis' => $n->postoperative_diagnosis,
            'procedure_performed'     => $n->procedure_performed,
            'anaesthesia_type'        => $n->anaesthesia_type,
            'procedure_details'       => $n->procedure_details,
            'findings'                => $n->findings,
            'ebl_ml'                  => $n->ebl_ml,
            'fluids_ml'               => $n->fluids_ml,
            'urine_output_ml'         => $n->urine_output_ml,
            'counts_correct'          => $n->counts_correct,
            'specimens'               => json_decode($n->specimens ?? '[]', true) ?: [],
            'complications_occurred'  => (bool) $n->complications_occurred,
            'complications'           => $n->complications,
            'post_op_plan'            => json_decode($n->post_op_plan ?? '{}', true) ?: [],
            'registration_number'     => $n->registration_number,
        ];
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
