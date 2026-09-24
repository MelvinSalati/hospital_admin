<?php

namespace App\Http\Controllers\Patients;

use App\Models\Patients\Patient;
use App\Models\Patients\Prescription;
use App\Models\Patients\PrescriptionItem;
use App\Models\Payments\Invoice;
use App\Models\Patients\PatientVisitScheme;
use App\Models\Payments\PaymentMethod;
use App\Models\Services\Service;
use App\Models\DrugItem;
use App\Helpers\VisitTokenHelper;
use App\Helpers\PaymentMethodHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Http\Controllers\Controller;

class PrescriptionsController extends Controller
{
    /**
     * Show the prescription workspace for a patient.
     */
    public function index(int $patientId)
    {
        $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
        $schemeId    = PatientVisitScheme::where('token', $activeToken['token'])
            ->value('scheme_id');

        $drugs = Service::where('scheme_type', $schemeId)
            ->where('service_category', 'Drugs')
            ->get();

        $defaultPaymentMethod = PaymentMethod::where('patient_id', $patientId)
            ->where('is_default', 1)
            ->where('type', 'mobile_money')
            ->first();

        return Inertia::render('patients/prescription', [
            'prescriptions' => Prescription::where('patient_id', $patientId)
                ->where('status', 'active')
                ->get(),
            'services' => $drugs,
            'patientId' => $patientId,
            'defaultPaymentMethod' => $defaultPaymentMethod,
        ]);
    }

    /**
     * Resolve the active visit token string for a patient.
     */
    public function token($patientId): string
    {
        $helper    = new VisitTokenHelper();
        $tokenData = $helper->getActiveToken($patientId);

        if (is_array($tokenData) && isset($tokenData['token'])) {
            return $tokenData['token'];
        }
        if (is_object($tokenData) && isset($tokenData->token)) {
            return $tokenData->token;
        }
        if (is_string($tokenData)) {
            return $tokenData;
        }

        return 'VISIT-' . $patientId . '-' . date('YmdHis');
    }

    /**
     * Store a prescription (create or append to existing).
     *
     * NOTE: No multiplication is performed here.
     *       The frontend must send the LINE TOTAL in `items.*.price`.
     *       `quantity` is stored only for display/dispensing reference.
     */
    public function store(Request $request, int $patientId)
    {
        $validator = Validator::make($request->all(), [
            'items'            => 'required|array|min:1',
            'items.*.id'       => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price'    => 'required|numeric|min:0', // line total
            'items.*.dosage'   => 'nullable|string',
            'items.*.frequency' => 'nullable|string',
            'items.*.route'    => 'nullable|string',
            'items.*.notes'    => 'nullable|string',
            'admission_number' => 'nullable|string',
            'is_admitted'      => 'boolean',
            'clinical_notes'   => 'nullable|string',
            'scheme'           => 'nullable|string|in:cash,nhima,insurance,charity,mobile_money',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $patient    = Patient::findOrFail($patientId);
        $visitToken = $this->token($patientId);
        $scheme     = $this->normalizeScheme($request->scheme ?? 'cash');

        DB::beginTransaction();

        try {
            // ---------- Build item payloads (NO multiplication) ----------
            [$itemsArray, $itemsForTable, $total] =
                $this->buildPrescriptionItemPayloads(
                    $request->items,
                    $scheme,
                    $visitToken,
                    $patient
                );

            // ---------- Find or create prescription ----------
            $existingPrescription = Prescription::where('visit_token', $visitToken)
                ->where('patient_id', $patientId)
                ->whereIn('status', ['active', 'draft'])
                ->first();

            if ($existingPrescription) {
                $merged = array_merge(
                    $existingPrescription->items ?? [],
                    $itemsArray
                );

                $existingPrescription->update([
                    'items'        => $merged,
                    'items_count'  => count($merged),
                    'total_amount' => ($existingPrescription->total_amount ?? 0) + $total,
                    'updated_at'   => now(),
                ]);

                $prescription = $existingPrescription->fresh();
                $isNew        = false;

                $prescriptionUuid = (string) Str::uuid();
                foreach ($itemsForTable as $row) {
                    PrescriptionItem::create([
                        'prescription_id'   => $prescription->id,
                        'prescription_uuid' => $prescriptionUuid,
                        ...$row,
                    ]);
                }

                \Log::info('Prescription appended', [
                    'prescription_id' => $prescription->id,
                    'visit_token'     => $visitToken,
                    'items_added'     => count($itemsArray),
                ]);
            } else {
                $prescription = Prescription::create([
                    'visit_token'         => $visitToken,
                    'patient_id'          => $patient->id,
                    'user_id'             => auth()->id(),
                    'prescription_number' => $this->generatePrescriptionNumber(),
                    'items'               => $itemsArray,
                    'status'              => 'active',
                    'prescribed_date'     => now(),
                    'clinical_notes'      => $request->clinical_notes,
                    'is_admitted'         => $request->boolean('is_admitted'),
                    'admission_number'    => $request->admission_number,
                    'items_count'         => count($itemsArray),
                    'payment_scheme'      => $scheme,
                    'total_amount'        => $total,
                ]);

                if (!$prescription->id) {
                    throw new \Exception('Failed to create prescription record');
                }

                $prescriptionUuid = (string) Str::uuid();
                foreach ($itemsForTable as $row) {
                    PrescriptionItem::create([
                        'prescription_id'   => $prescription->id,
                        'prescription_uuid' => $prescriptionUuid,
                        ...$row,
                    ]);
                }

                $isNew = true;

                \Log::info('Prescription created', [
                    'prescription_id' => $prescription->id,
                    'visit_token'     => $visitToken,
                    'items_count'     => count($itemsArray),
                    'total'           => $total,
                ]);
            }

            // ---------- Find or create invoice ----------
            $existingInvoice = Invoice::where('visit_token', $visitToken)
                ->where('patient_id', $patientId)
                ->whereIn('status', ['draft', 'unpaid'])
                ->first();

            if ($existingInvoice) {
                $invoice = $this->appendToInvoice(
                    $existingInvoice,
                    $itemsArray,
                    $total,
                    $prescription
                );
            } else {
                $invoice = $this->createInvoice(
                    $patient,
                    $prescription,
                    $itemsArray,
                    $total,
                    $scheme,
                    $request->admission_number,
                    $visitToken
                );
            }

            $prescription->update(['invoice_id' => $invoice->id]);

            DB::commit();

            return response()->json([
                'success'        => true,
                'message'        => $isNew
                    ? 'Prescription created and ' . ($existingInvoice ? 'added to existing invoice' : 'new invoice created')
                    : 'Items appended to existing prescription and invoice',
                'prescription'   => $prescription->fresh(),
                'invoice'        => $invoice->fresh(),
                'invoice_number' => $invoice->invoice_number,
                'same_invoice'   => (bool) $existingInvoice,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Prescription creation failed: ' . $e->getMessage(), [
                'trace'      => $e->getTraceAsString(),
                'patient_id' => $patientId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create/update prescription',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk drug list with per-scheme pricing (API).
     */
    public function getDrugsWithPricing($patientId)
    {
        $paymentHelper = new PaymentMethodHelper($patientId);

        $drugs = DrugItem::all()->map(fn($drug) => [
            'id'                      => $drug->id,
            'drug_name'               => $drug->drug_name,
            'service_name'            => $drug->drug_name,
            'price'                   => $drug->selling_price ?? 0,
            'selling_price'           => $drug->selling_price ?? 0,
            'nhima_price'             => $drug->nhima_price ?? 0,
            'insurance_price'         => $drug->insurance_price ?? 0,
            'charity_price'           => $drug->charity_price ?? 0,
            'stock'                   => $drug->maximum_stock_level ?? 0,
            'dosage_form'             => $drug->dosage_form,
            'route_of_administration' => $drug->route_of_administration,
            'brand_name'              => $drug->brand_name,
            'generic_name'            => $drug->generic_name,
            'unit_of_measure'         => $drug->unit_of_measure,
            'pack_size'               => $drug->pack_size,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'payment_method' => $paymentHelper->getPaymentMethod(),
                'price_column'   => $paymentHelper->getPriceColumn(),
                'drugs'          => $drugs,
                'currency'       => 'ZMW',
            ],
        ]);
    }

    /**
     * Single drug price (API).
     */
    public function getDrugPrice($patientId, $drugId)
    {
        $paymentHelper = new PaymentMethodHelper($patientId);
        $price         = $paymentHelper->getDrugPrice($drugId);

        if ($price === null) {
            return response()->json([
                'success' => false,
                'message' => 'Drug not found',
            ], 404);
        }

        $drug = DrugItem::find($drugId);

        return response()->json([
            'success' => true,
            'data' => [
                'drug_id'        => $drugId,
                'drug_name'      => $drug->drug_name,
                'service_name'   => $drug->drug_name,
                'payment_method' => $paymentHelper->getPaymentMethod(),
                'price'          => $price,
                'selling_price'  => $drug->selling_price ?? 0,
                'original_prices' => [
                    'cash'      => $drug->selling_price ?? 0,
                    'nhima'     => $drug->nhima_price ?? 0,
                    'insurance' => $drug->insurance_price ?? 0,
                    'charity'   => $drug->charity_price ?? 0,
                ],
            ],
        ]);
    }

    /**
     * Calculate total for selected drugs (API).
     *
     * NOTE: Frontend should pass line totals directly, so this endpoint
     *       simply sums the provided `price` fields — no multiplication.
     */
    public function calculateDrugTotal(Request $request, $patientId)
    {
        $request->validate([
            'items'            => 'required|array',
            'items.*.id'       => 'required|exists:drug_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price'    => 'required|numeric|min:0',
        ]);

        $paymentHelper = new PaymentMethodHelper($patientId);

        $items = [];
        $total = 0;

        foreach ($request->items as $item) {
            $drug = DrugItem::find($item['id']);
            if (!$drug) continue;

            $lineTotal = (float) $item['price']; // already the line total
            $total    += $lineTotal;

            $items[] = [
                'id'           => $drug->id,
                'drug_name'    => $drug->drug_name,
                'service_name' => $drug->drug_name,
                'quantity'     => $item['quantity'],
                'price'        => $lineTotal,
                'total'        => $lineTotal,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'payment_method' => $paymentHelper->getPaymentMethod(),
                'items'          => $items,
                'total'          => $total,
                'currency'       => 'ZMW',
            ],
        ]);
    }

    // ================================================================
    // PRIVATE HELPERS
    // ================================================================

    private function normalizeScheme(?string $scheme): string
    {
        return $scheme === 'mobile_money' ? 'cash' : ($scheme ?? 'cash');
    }

    /**
     * Build the JSON array + per-item rows + grand total.
     *
     * NO MULTIPLICATION:
     *   - `price` is treated as the LINE TOTAL.
     *   - `quantity` is stored for reference/dispensing only.
     *   - `total` = `price` (same value, for compatibility with existing UI).
     *
     * @return array{0: array, 1: array, 2: float}
     */
    private function buildPrescriptionItemPayloads(
        array $items,
        string $scheme,
        string $visitToken,
        Patient $patient
    ): array {
        $itemsArray    = [];
        $itemsForTable = [];
        $total         = 0;

        foreach ($items as $item) {
            $drug = Service::find($item['id']);
            if (!$drug) {
                throw new \Exception("Drug with ID {$item['id']} not found");
            }

            // Line total comes from the frontend — no multiplication
            $lineTotal = (float) $item['price'];
            $unitPrice = $item['quantity'] > 0
                ? round($lineTotal / $item['quantity'], 2)
                : $lineTotal; // derive unit price for display only

            $total += $lineTotal;

            // Resolve drug name with fallbacks
            $drugName = $drug->drug_name
                ?? $drug->service_name
                ?? null;

            if (empty($drugName)) {
                \Log::warning('Drug missing name fields', [
                    'drug_id'      => $drug->id,
                    'service_name' => $drug->service_name,
                    'drug_name'    => $drug->drug_name,
                ]);
                $drugName = 'Unknown Drug (ID: ' . $drug->id . ')';
            }

            // ---------- JSON column on prescriptions ----------
            $itemsArray[] = [
                'id'                       => $drug->id,
                'drug_id'                  => $drug->id,
                'drug_name'                => $drugName,
                'service_name'             => $drug->service_name,
                'name'                     => $drug->service_name,
                'category'                 => $drug->therapeutic_class ?? 'Pharmacy',
                'quantity'                 => $item['quantity'],
                'price'                    => $lineTotal,   // line total (no multiply)
                'unit_price'               => $unitPrice,   // derived, display only
                'total'                    => $lineTotal,   // same as price
                'dosage'                   => $item['dosage'] ?? $drug->dosage_form,
                'frequency'                => $item['frequency'] ?? null,
                'route'                    => $item['route'] ?? $drug->route_of_administration,
                'instructions'             => $item['notes'] ?? null,
                'payment_status'           => 'pending',
                'dispensation_status'      => 'pending',
                'payment_method_used'      => $scheme,
                'original_price_cash'      => $drug->selling_price ?? 0,
                'original_price_nhima'     => $drug->nhima_price ?? 0,
                'original_price_insurance' => $drug->insurance_price ?? 0,
                'original_price_charity'   => $drug->charity_price ?? 0,
                'drug_code'                => $drug->drug_code,
                'brand_name'               => $drug->brand_name,
                'generic_name'             => $drug->generic_name,
                'strength'                 => $drug->strength,
                'unit_of_measure'          => $drug->unit_of_measure,
                'pack_size'                => $drug->pack_size,
            ];

            // ---------- prescription_items table ----------
            $itemsForTable[] = [
                'visit_token'         => $visitToken,
                'patient_id'          => $patient->id,
                'service_id'          => $drug->id,
                'drug_name'           => $drugName,
                'drug_code'           => $drug->drug_code ?? null,
                'drug_category'       => $drug->therapeutic_class ?? null,
                'dosage'              => $item['dosage'] ?? $drug->dosage_form,
                'dosage_unit'         => $drug->unit_of_measure ?? null,
                'frequency'           => $item['frequency'] ?? null,
                'frequency_label'     => $this->getFrequencyLabel($item['frequency'] ?? null),
                'route'               => $item['route'] ?? $drug->route_of_administration,
                'instructions'        => $item['notes'] ?? null,
                'quantity_prescribed' => $item['quantity'],
                'quantity_dispensed'  => 0,
                'quantity_remaining'  => $item['quantity'],
                'unit_price'          => $unitPrice,   // derived, display only
                'total_price'         => $lineTotal,   // line total (no multiply)
                'currency'            => 'ZMW',
                'payment_status'      => 'pending',
                'payment_amount'      => 0,
                'dispensation_status' => 'pending',
                'is_active'           => true,
                'is_cancelled'        => false,
                'payment_scheme'      => $scheme,
                'brand_name'          => $drug->brand_name,
                'generic_name'        => $drug->generic_name,
                'strength'            => $drug->strength,
            ];
        }

        return [$itemsArray, $itemsForTable, $total];
    }

    /**
     * Append items to an existing invoice — sums line totals, no multiplication.
     */
    private function appendToInvoice(
        Invoice $invoice,
        array $itemsArray,
        float $total,
        Prescription $prescription
    ): Invoice {
        $existingItems = $invoice->items ?? [];

        if (is_string($existingItems)) {
            $existingItems = json_decode($existingItems, true) ?: [];
        }

        $merged   = array_merge($existingItems, $itemsArray);
        $newTotal = (float) $invoice->total + $total;
        $newDue   = $newTotal - (float) $invoice->paid_amount;

        $invoice->update([
            'items'           => $merged,
            'subtotal'        => $newTotal,
            'total'           => $newTotal,
            'due_amount'      => $newDue,
            'items_count'     => count($merged),
            'prescription_id' => $prescription->id,
            'updated_at'      => now(),
        ]);

        \Log::info('Appended items to invoice', [
            'invoice_id'      => $invoice->id,
            'invoice_number'  => $invoice->invoice_number,
            'prescription_id' => $prescription->id,
            'old_total'       => $invoice->getOriginal('total'),
            'new_total'       => $newTotal,
            'items_added'     => count($itemsArray),
        ]);

        return $invoice->fresh();
    }

    /**
     * Create a brand-new invoice for a prescription.
     */
    private function createInvoice(
        Patient $patient,
        Prescription $prescription,
        array $items,
        float $total,
        string $scheme,
        ?string $admissionNumber,
        string $visitToken
    ): Invoice {
        if (!$prescription->id) {
            throw new \Exception('Cannot create invoice without a valid prescription ID');
        }

        return Invoice::create([
            'visit_token'      => $visitToken,
            'invoice_number'   => Invoice::generateInvoiceNumber(),
            'patient_id'       => $patient->id,
            'user_id'          => auth()->id(),
            'prescription_id'  => $prescription->id,
            'admission_number' => $admissionNumber ?? $prescription->admission_number,
            'customer_name'    => $patient->name
                ?? trim(($patient->first_name ?? '') . ' ' . ($patient->last_name ?? '')),
            'customer_email'   => $patient->email,
            'customer_phone'   => $patient->phone,
            'customer_address' => $patient->address ?? null,
            'subtotal'         => $total,
            'tax'              => 0,
            'discount'         => 0,
            'total'            => $total,
            'paid_amount'      => 0,
            'due_amount'       => $total,
            'currency'         => 'ZMW',
            'payment_scheme'   => $scheme,
            'items'            => $items,
            'items_count'      => count($items),
            'issue_date'       => now(),
            'due_date'         => now()->addDays(30),
            'status'           => 'draft',
            'invoice_type'     => 'prescription',
        ]);
    }

    /**
     * Resolve unit price for a drug based on scheme.
     */
    private function getPriceForScheme(Service $drug, string $scheme): float
    {
        return match ($scheme) {
            'cash'      => (float) ($drug->selling_price ?? 0),
            'nhima'     => (float) ($drug->nhima_price ?? 0),
            'insurance' => (float) ($drug->insurance_price ?? 0),
            'charity'   => (float) ($drug->charity_price ?? 0),
            default     => (float) ($drug->selling_price ?? 0),
        };
    }

    /**
     * Convert frequency code to human label.
     */
    private function getFrequencyLabel(?string $frequency): ?string
    {
        if (!$frequency) return null;

        return [
            'OD'   => 'Once daily',
            'BD'   => 'Twice daily',
            'TDS'  => 'Three times daily',
            'QID'  => 'Four times daily',
            'Q4H'  => 'Every 4 hours',
            'Q6H'  => 'Every 6 hours',
            'Q8H'  => 'Every 8 hours',
            'Q12H' => 'Every 12 hours',
            'PRN'  => 'As needed',
            'STAT' => 'Immediately',
        ][$frequency] ?? $frequency;
    }

    /**
     * Generate sequential prescription number: RX-YYYYMM-0001.
     */
    private function generatePrescriptionNumber(): string
    {
        $year  = date('Y');
        $month = date('m');

        $last = Prescription::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderByDesc('id')
            ->first();

        if ($last && $last->prescription_number) {
            $lastNumber = (int) substr($last->prescription_number, -4);
            $newNumber  = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "RX-{$year}{$month}-{$newNumber}";
    }
}
