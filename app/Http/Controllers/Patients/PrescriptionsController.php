<?php

namespace App\Http\Controllers\Patients;

use App\Models\Patients\Patient;
use App\Models\Patients\Prescription;
use App\Models\Patients\PrescriptionItem;
use App\Models\Payments\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\DrugItem;
use App\Http\Controllers\Controller;
use App\Helpers\VisitTokenHelper;
use App\Helpers\PaymentMethodHelper;
use App\Models\Payments\PaymentMethod;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PrescriptionsController extends Controller
{

    public function index($patientId)
    {
        // Initialize PaymentMethodHelper for this patient
        $paymentHelper = new PaymentMethodHelper($patientId);
        $paymentMethod = $paymentHelper->getPaymentMethod();

        // Get drugs and transform them to match frontend expectations
        $drugs = DrugItem::all()->map(function ($drug) {
            return [
                'id' => $drug->id,
                'service_name' => $drug->drug_name,
                'service_category' => $drug->therapeutic_class ?? 'Pharmacy',
                'service_code' => $drug->drug_code,
                'description' => $drug->generic_name ?? null,
                'price' => $drug->selling_price ?? 0,
                'cash_price' => $drug->selling_price ?? 0,
                'nhima_price' => $drug->nhima_price ?? 0,
                'insurance_price' => $drug->insurance_price ?? 0,
                'charity_price' => $drug->charity_price ?? 0,
                'stock' => $drug->maximum_stock_level ?? 0,
                'dosage' => $drug->dosage_form ?? null,
                'dosage_form' => $drug->dosage_form ?? null,
                'frequency' => null,
                'route' => $drug->route_of_administration ?? null,
                'route_of_administration' => $drug->route_of_administration ?? null,
                'presentation' => $drug->dosage_form ?? null,
                'strength' => $drug->strength ?? null,
                'strength_unit' => $drug->unit_of_measure ?? null,
                'unit_of_measure' => $drug->unit_of_measure ?? null,
                'brand_name' => $drug->brand_name,
                'generic_name' => $drug->generic_name,
                'pack_size' => $drug->pack_size,
                'barcode' => $drug->barcode,
                'is_active' => $drug->is_active,
                'track_batches' => $drug->track_batches,
                'track_expiry' => $drug->track_expiry,
                'minimum_stock_level' => $drug->minimum_stock_level,
                'maximum_stock_level' => $drug->maximum_stock_level,
                'reorder_level' => $drug->reorder_level,
                'purchase_price' => $drug->purchase_price,
                'selling_price' => $drug->selling_price,
                // Keep original drug data for reference
                '_original' => $drug->toArray(),
            ];
        });

        // Get default payment method (if needed for display)
        $defaultPaymentMethod = PaymentMethod::where('patient_id', $patientId)
            ->where('is_default', 1)
            ->where('type', 'mobile_money')
            ->first();

        return Inertia::render('patients/prescription', [
            'prescriptions' => Prescription::where('patient_id', $patientId)
                ->where('status', 'active')
                ->get(),
            'services' => $drugs, // Now properly transformed for frontend
            'patientId' => $patientId,
            'payment_method' => $paymentMethod,
            'price_column' => $paymentHelper->getPriceColumn(),
            'default_payment_method' => $defaultPaymentMethod
        ]);
    }

    public function token($patientId)
    {
        $patient = new VisitTokenHelper();
        $tokenData = $patient->getActiveToken($patientId);

        // Extract just the token string
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

    public function store(Request $request, $patientId)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:drug_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.dosage' => 'nullable|string',
            'items.*.frequency' => 'nullable|string',
            'items.*.route' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
            'items.*.price' => 'nullable|numeric',
            'admission_number' => 'nullable|string',
            'is_admitted' => 'boolean',
            'clinical_notes' => 'nullable|string',
            'scheme' => 'nullable|string|in:cash,nhima,insurance,charity,mobile_money',
        ]);

        $patient = Patient::findOrFail($patientId);
        $visitToken = $this->token($patientId);
        $scheme = $request->scheme ?? 'cash';

        DB::beginTransaction();

        try {
            // Prepare prescription items array (for JSON storage)
            $prescriptionItemsArray = [];
            $prescriptionItemsForTable = [];
            $total = 0;

            // Prepare items for storage
            foreach ($request->items as $index => $item) {
                $drug = DrugItem::find($item['id']);
                if (!$drug) {
                    throw new \Exception("Drug with ID {$item['id']} not found");
                }

                // Get price based on scheme
                $price = $item['price'] ?? $this->getPriceForScheme($drug, $scheme);
                $itemTotal = $price * $item['quantity'];
                $total += $itemTotal;

                // Format for prescriptions.items JSON column (frontend expects this)
                $prescriptionItemsArray[] = [
                    'id' => $drug->id,
                    'drug_id' => $drug->id,
                    'drug_name' => $drug->drug_name,
                    'service_name' => $drug->drug_name,
                    'name' => $drug->drug_name,
                    'category' => $drug->therapeutic_class ?? 'Pharmacy',
                    'quantity' => $item['quantity'],
                    'price' => $price,
                    'total' => $itemTotal,
                    'dosage' => $item['dosage'] ?? $drug->dosage_form ?? null,
                    'frequency' => $item['frequency'] ?? null,
                    'route' => $item['route'] ?? $drug->route_of_administration ?? null,
                    'instructions' => $item['notes'] ?? null,
                    'payment_status' => 'pending',
                    'dispensation_status' => 'pending',
                    'payment_method_used' => $scheme,
                    'original_price_cash' => $drug->selling_price ?? 0,
                    'original_price_nhima' => $drug->nhima_price ?? 0,
                    'original_price_insurance' => $drug->insurance_price ?? 0,
                    'original_price_charity' => $drug->charity_price ?? 0,
                    'drug_code' => $drug->drug_code,
                    'brand_name' => $drug->brand_name,
                    'generic_name' => $drug->generic_name,
                    'strength' => $drug->strength,
                    'unit_of_measure' => $drug->unit_of_measure,
                    'pack_size' => $drug->pack_size,
                ];

                // Format for prescription_items table (for payment tracking)
                $prescriptionItemsForTable[] = [
                    'visit_token' => $visitToken,
                    'patient_id' => $patient->id,
                    'service_id' => $drug->id,
                    'drug_name' => $drug->drug_name,
                    'drug_code' => $drug->drug_code ?? null,
                    'drug_category' => $drug->therapeutic_class ?? null,
                    'dosage' => $item['dosage'] ?? $drug->dosage_form ?? null,
                    'dosage_unit' => $drug->unit_of_measure ?? null,
                    'frequency' => $item['frequency'] ?? null,
                    'frequency_label' => $this->getFrequencyLabel($item['frequency'] ?? null),
                    'route' => $item['route'] ?? $drug->route_of_administration ?? null,
                    'instructions' => $item['notes'] ?? null,
                    'quantity_prescribed' => $item['quantity'],
                    'quantity_dispensed' => 0,
                    'quantity_remaining' => $item['quantity'],
                    'unit_price' => $price,
                    'total_price' => $itemTotal,
                    'currency' => 'ZMW',
                    'payment_status' => 'pending',
                    'payment_amount' => 0,
                    'dispensation_status' => 'pending',
                    'is_active' => true,
                    'is_cancelled' => false,
                    'payment_scheme' => $scheme,
                    'brand_name' => $drug->brand_name,
                    'generic_name' => $drug->generic_name,
                    'strength' => $drug->strength,
                ];
            }

            // Check for existing active prescription with same visit_token
            $existingPrescription = Prescription::where('visit_token', $visitToken)
                ->where('patient_id', $patientId)
                ->whereIn('status', ['active', 'draft'])
                ->first();

            // CRITICAL FIX: Check for existing invoice by visit_token FIRST
            $existingInvoice = Invoice::where('visit_token', $visitToken)
                ->where('patient_id', $patientId)
                ->whereIn('status', ['draft', 'unpaid'])
                ->first();

            $prescription = null;
            $invoice = null;

            if ($existingPrescription) {
                // ============================================
                // APPEND to existing prescription
                // ============================================
                $existingItems = $existingPrescription->items ?? [];
                $mergedItems = array_merge($existingItems, $prescriptionItemsArray);
                $newTotalItems = $existingPrescription->items_count + count($prescriptionItemsArray);

                $existingPrescription->update([
                    'items' => $mergedItems,
                    'items_count' => count($mergedItems),
                    'total_amount' => ($existingPrescription->total_amount ?? 0) + $total,
                    'updated_at' => now(),
                ]);

                $prescription = $existingPrescription->fresh();

                // Create prescription items in separate table for tracking
                foreach ($prescriptionItemsForTable as $itemData) {
                    PrescriptionItem::create([
                        'prescription_id' => $prescription->id,
                        'prescription_uuid' => (string) Str::uuid(),
                        ...$itemData
                    ]);
                }

                // ============================================
                // CRITICAL FIX: Update existing invoice or create new one
                // ============================================
                if ($existingInvoice) {
                    // USE THE SAME INVOICE - append items
                    $existingInvoiceItems = $existingInvoice->items ?? [];

                    // Handle both string and array cases
                    if (is_string($existingInvoiceItems)) {
                        $existingInvoiceItems = json_decode($existingInvoiceItems, true) ?: [];
                    }

                    $mergedInvoiceItems = array_merge($existingInvoiceItems, $prescriptionItemsArray);
                    $newInvoiceTotal = $existingInvoice->total + $total;

                    $existingInvoice->update([
                        'items' => $mergedInvoiceItems,  // Model cast will handle JSON
                        'subtotal' => $newInvoiceTotal,
                        'total' => $newInvoiceTotal,
                        'due_amount' => $newInvoiceTotal - $existingInvoice->paid_amount,
                        'items_count' => count($mergedInvoiceItems),
                        'updated_at' => now(),
                    ]);

                    $invoice = $existingInvoice->fresh();

                    \Log::info('Appended to existing invoice', [
                        'invoice_id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'visit_token' => $visitToken,
                        'old_total' => $existingInvoice->total,
                        'new_total' => $newInvoiceTotal,
                        'items_added' => count($prescriptionItemsArray)
                    ]);
                } else {
                    // Create new invoice for this prescription (but this shouldn't happen if token exists)
                    $invoice = $this->createInvoice($patient, $prescription, $prescriptionItemsArray, $total, $scheme, $request->admission_number, $visitToken);

                    \Log::info('Created new invoice for existing prescription', [
                        'invoice_id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'visit_token' => $visitToken,
                        'prescription_id' => $prescription->id
                    ]);
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Items appended to existing prescription and invoice successfully',
                    'prescription' => $prescription->fresh(),
                    'invoice' => $invoice,
                    'appended_items' => count($prescriptionItemsArray),
                    'invoice_number' => $invoice->invoice_number,
                    'same_invoice' => true
                ]);
            } else {
                // ============================================
                // CREATE NEW prescription
                // ============================================
                $prescription = Prescription::create([
                    'visit_token' => $visitToken,
                    'patient_id' => $patient->id,
                    'user_id' => auth()->id(),
                    'prescription_number' => $this->generatePrescriptionNumber(),
                    'items' => $prescriptionItemsArray,
                    'status' => 'active',
                    'prescribed_date' => now(),
                    'clinical_notes' => $request->clinical_notes ?? null,
                    'is_admitted' => $request->is_admitted ?? false,
                    'admission_number' => $request->admission_number ?? null,
                    'items_count' => count($prescriptionItemsArray),
                    'payment_scheme' => $scheme,
                    'total_amount' => $total,
                ]);

                // Verify prescription was created and has an ID
                if (!$prescription->id) {
                    throw new \Exception('Failed to create prescription record');
                }

                // Create prescription items in separate table for detailed tracking
                foreach ($prescriptionItemsForTable as $itemData) {
                    PrescriptionItem::create([
                        'prescription_id' => $prescription->id,
                        'prescription_uuid' => (string) Str::uuid(),
                        ...$itemData
                    ]);
                }

                // ============================================
                // CRITICAL FIX: Check for existing invoice BEFORE creating new one
                // ============================================
                if ($existingInvoice) {
                    // USE THE SAME INVOICE - append items
                    $existingInvoiceItems = $existingInvoice->items ?? [];

                    if (is_string($existingInvoiceItems)) {
                        $existingInvoiceItems = json_decode($existingInvoiceItems, true) ?: [];
                    }

                    $mergedInvoiceItems = array_merge($existingInvoiceItems, $prescriptionItemsArray);
                    $newInvoiceTotal = $existingInvoice->total + $total;

                    $existingInvoice->update([
                        'items' => $mergedInvoiceItems,
                        'subtotal' => $newInvoiceTotal,
                        'total' => $newInvoiceTotal,
                        'due_amount' => $newInvoiceTotal - $existingInvoice->paid_amount,
                        'items_count' => count($mergedInvoiceItems),
                        'prescription_id' => $prescription->id, // Link to new prescription
                        'updated_at' => now(),
                    ]);

                    $invoice = $existingInvoice->fresh();

                    \Log::info('Added prescription to existing invoice', [
                        'invoice_id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'visit_token' => $visitToken,
                        'prescription_id' => $prescription->id,
                        'old_total' => $existingInvoice->total,
                        'new_total' => $newInvoiceTotal
                    ]);
                } else {
                    // Create brand new invoice
                    $invoice = $this->createInvoice($patient, $prescription, $prescriptionItemsArray, $total, $scheme, $request->admission_number, $visitToken);

                    \Log::info('Created new invoice for new prescription', [
                        'invoice_id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'visit_token' => $visitToken,
                        'prescription_id' => $prescription->id
                    ]);
                }

                // Link prescription to invoice
                $prescription->update(['invoice_id' => $invoice->id]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Prescription created and ' . ($existingInvoice ? 'added to existing invoice' : 'new invoice created'),
                    'prescription' => $prescription,
                    'invoice' => $invoice,
                    'invoice_number' => $invoice->invoice_number,
                    'same_invoice' => $existingInvoice ? true : false
                ]);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Prescription creation failed: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create/update prescription',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get drugs with correct pricing based on patient's payment method
     * API endpoint for dynamic drug pricing
     */
    public function getDrugsWithPricing($patientId)
    {
        $paymentHelper = new PaymentMethodHelper($patientId);

        $drugs = DrugItem::all()->map(function ($drug) {
            return [
                'id' => $drug->id,
                'drug_name' => $drug->drug_name,
                'service_name' => $drug->drug_name,
                'price' => $drug->selling_price ?? 0,
                'selling_price' => $drug->selling_price ?? 0,
                'nhima_price' => $drug->nhima_price ?? 0,
                'insurance_price' => $drug->insurance_price ?? 0,
                'charity_price' => $drug->charity_price ?? 0,
                'stock' => $drug->maximum_stock_level ?? 0,
                'dosage_form' => $drug->dosage_form,
                'route_of_administration' => $drug->route_of_administration,
                'brand_name' => $drug->brand_name,
                'generic_name' => $drug->generic_name,
                'unit_of_measure' => $drug->unit_of_measure,
                'pack_size' => $drug->pack_size,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'payment_method' => $paymentHelper->getPaymentMethod(),
                'price_column' => $paymentHelper->getPriceColumn(),
                'drugs' => $drugs,
                'currency' => 'ZMW'
            ]
        ]);
    }

    /**
     * Get single drug price based on payment method
     */
    public function getDrugPrice($patientId, $drugId)
    {
        $paymentHelper = new PaymentMethodHelper($patientId);

        $price = $paymentHelper->getDrugPrice($drugId);

        if ($price === null) {
            return response()->json([
                'success' => false,
                'message' => 'Drug not found'
            ], 404);
        }

        $drug = DrugItem::find($drugId);

        return response()->json([
            'success' => true,
            'data' => [
                'drug_id' => $drugId,
                'drug_name' => $drug->drug_name,
                'service_name' => $drug->drug_name,
                'payment_method' => $paymentHelper->getPaymentMethod(),
                'price' => $price,
                'selling_price' => $drug->selling_price ?? 0,
                'original_prices' => [
                    'cash' => $drug->selling_price ?? 0,
                    'nhima' => $drug->nhima_price ?? 0,
                    'insurance' => $drug->insurance_price ?? 0,
                    'charity' => $drug->charity_price ?? 0
                ]
            ]
        ]);
    }

    /**
     * Calculate total for selected drugs based on payment method
     */
    public function calculateDrugTotal(Request $request, $patientId)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:drug_items,id',
            'items.*.quantity' => 'required|integer|min:1'
        ]);

        $paymentHelper = new PaymentMethodHelper($patientId);

        $drugIds = [];
        $itemsWithQuantities = [];

        foreach ($request->items as $item) {
            $drugIds[] = $item['id'];
            $itemsWithQuantities[$item['id']] = $item['quantity'];
        }

        $drugs = DrugItem::whereIn('id', $drugIds)->get()->map(function ($drug) {
            return (object) [
                'id' => $drug->id,
                'drug_name' => $drug->drug_name,
                'service_name' => $drug->drug_name,
                'price' => $drug->selling_price ?? 0,
                'selling_price' => $drug->selling_price ?? 0,
            ];
        });

        $total = 0;
        foreach ($drugs as $drug) {
            $quantity = $itemsWithQuantities[$drug->id] ?? 1;
            $total += $drug->price * $quantity;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'payment_method' => $paymentHelper->getPaymentMethod(),
                'items' => $drugs,
                'total' => $total,
                'currency' => 'ZMW'
            ]
        ]);
    }

    private function createInvoice($patient, $prescription, $items, $total, $scheme, $admissionNumber = null, $visitToken)
    {
        // Ensure prescription has an ID
        if (!$prescription->id) {
            throw new \Exception('Cannot create invoice without a valid prescription ID');
        }

        return Invoice::create([
            'visit_token' => $visitToken,
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'patient_id' => $patient->id,
            'user_id' => auth()->id(),
            'prescription_id' => $prescription->id,
            'admission_number' => $admissionNumber ?? $prescription->admission_number,
            'customer_name' => $patient->name,
            'customer_email' => $patient->email,
            'customer_phone' => $patient->phone,
            'customer_address' => $patient->address ?? null,
            'subtotal' => $total,
            'tax' => 0,
            'discount' => 0,
            'total' => $total,
            'paid_amount' => 0,
            'due_amount' => $total,
            'currency' => 'ZMW',
            'payment_scheme' => $scheme === 'mobile_money' ? 'cash' : $scheme,
            'items' => $items,
            'items_count' => count($items),
            'issue_date' => now(),
            'due_date' => now()->addDays(30),
            'status' => 'draft',
            'invoice_type' => 'prescription',
        ]);
    }

    private function getPriceForScheme($drug, $scheme)
    {
        $effectiveScheme = $scheme === 'mobile_money' ? 'cash' : $scheme;

        switch ($effectiveScheme) {
            case 'cash':
                return $drug->selling_price ?? 0;
            case 'nhima':
                return $drug->nhima_price ?? 0;
            case 'insurance':
                return $drug->insurance_price ?? 0;
            case 'charity':
                return $drug->charity_price ?? 0;
            default:
                return $drug->selling_price ?? 0;
        }
    }

    private function getFrequencyLabel($frequency)
    {
        $labels = [
            'OD' => 'Once daily',
            'BD' => 'Twice daily',
            'TDS' => 'Three times daily',
            'QID' => 'Four times daily',
            'Q4H' => 'Every 4 hours',
            'Q6H' => 'Every 6 hours',
            'Q8H' => 'Every 8 hours',
            'Q12H' => 'Every 12 hours',
            'PRN' => 'As needed',
            'STAT' => 'Immediately',
        ];

        return $labels[$frequency] ?? $frequency;
    }

    private function generatePrescriptionNumber()
    {
        $year = date('Y');
        $month = date('m');
        $lastPrescription = Prescription::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastPrescription && $lastPrescription->prescription_number) {
            $lastNumber = intval(substr($lastPrescription->prescription_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "RX-{$year}{$month}-{$newNumber}";
    }
}
