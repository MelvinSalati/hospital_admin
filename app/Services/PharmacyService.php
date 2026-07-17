<?php
// app/Services/PharmacyService.php

namespace App\Services;

use App\Repositories\PharmacyRepository;
use App\Repositories\PatientRepository;
use App\Repositories\BillingRepository;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use DB;

class PharmacyService 
{
    protected $pharmacyRepository;
    protected $patientRepository;
    protected $billingRepository;

    public function __construct(
        PharmacyRepository $pharmacyRepository,
        PatientRepository $patientRepository,
        BillingRepository $billingRepository
    ) {
       
        $this->pharmacyRepository = $pharmacyRepository;
        $this->patientRepository = $patientRepository;
        $this->billingRepository = $billingRepository;
    }

    /**
     * Get drugs list with filters
     */
    public function getDrugsList(array $filters = [])
    {
        $perPage = $filters['per_page'] ?? 15;
        return $this->pharmacyRepository->getDrugsList($filters, $perPage);
    }

    /**
     * Get drug details
     */
    public function getDrugDetails($id)
    {
        $result = $this->pharmacyRepository->getDrugDetails($id);

        if (!$result) {
            throw new \Exception('Drug not found');
        }

        return $result;
    }

    /**
     * Create new drug
     */
    public function createDrug(array $data)
    {
        $this->validateDrug($data);

        return $this->pharmacyRepository->createDrug($data);
    }

    /**
     * Update drug
     */
    public function updateDrug($id, array $data)
    {
        $drug = $this->pharmacyRepository->find($id);

        if (!$drug) {
            throw new \Exception('Drug not found');
        }

        $this->validateDrug($data, $id);

        return $this->pharmacyRepository->updateDrug($id, $data);
    }

    /**
     * Delete drug
     */
    public function deleteDrug($id)
    {
        $drug = $this->pharmacyRepository->find($id);

        if (!$drug) {
            throw new \Exception('Drug not found');
        }

        // Check if drug has stock
        $stocks = $this->pharmacyRepository->getDrugStocks($id);
        $hasStock = $stocks->sum('quantity_available') > 0;

        if ($hasStock) {
            throw new \Exception('Cannot delete drug with available stock');
        }

        return $this->pharmacyRepository->deleteDrug($id);
    }

    /**
     * Get low stock drugs
     */
    public function getLowStockDrugs()
    {
        return $this->pharmacyRepository->getLowStockDrugs();
    }

    /**
     * Get expiring drugs
     */
    public function getExpiringDrugs($days = 30)
    {
        return $this->pharmacyRepository->getExpiringDrugs($days);
    }

    /**
     * Get expired drugs
     */
    public function getExpiredDrugs()
    {
        return $this->pharmacyRepository->getExpiredDrugs();
    }

    /**
     * Process dispensation
     */
    public function dispenseDrugs(array $data)
    {
        // Validate dispensation data
        $validator = Validator::make($data, [
            'patient_id' => 'required|integer|exists:patients,id',
            'prescription_id' => 'nullable|integer|exists:prescriptions,id',
            'items' => 'required|array|min:1',
            'items.*.drug_id' => 'required|integer|exists:drugs,id',
            'items.*.batch_id' => 'required|integer|exists:drug_stocks,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.dosage' => 'nullable|string',
            'items.*.instructions' => 'nullable|string',
            'is_emergency' => 'boolean',
            'emergency_reason' => 'required_if:is_emergency,true|string'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $isEmergency = $data['is_emergency'] ?? false;
        $totalAmount = 0;
        $dispensationItems = [];

        // Validate each item and calculate total
        foreach ($data['items'] as $item) {
            $drug = DB::table('drugs')->find($item['drug_id']);

            if (!$drug) {
                throw new \Exception("Drug not found: {$item['drug_id']}");
            }

            $batch = DB::table('drug_stocks')
                ->where('id', $item['batch_id'])
                ->where('drug_id', $item['drug_id'])
                ->first();

            if (!$batch) {
                throw new \Exception("Invalid batch for drug: {$drug->name}");
            }

            if ($batch->quantity_available < $item['quantity']) {
                throw new \Exception("Insufficient stock for batch {$batch->batch_number}. Available: {$batch->quantity_available}");
            }

            if ($batch->expiry_date && $batch->expiry_date <= now()) {
                throw new \Exception("Batch {$batch->batch_number} has expired");
            }

            $itemTotal = $drug->selling_price * $item['quantity'];
            $totalAmount += $itemTotal;

            $dispensationItems[] = [
                'drug_id' => $item['drug_id'],
                'stock_id' => $item['batch_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $drug->selling_price,
                'total' => $itemTotal,
                'dosage' => $item['dosage'] ?? null,
                'instructions' => $item['instructions'] ?? null,
                'stock_before' => $batch->quantity_available,
                'purchase_price' => $batch->purchase_price
            ];
        }

        // Check payment for non-emergency
        if (!$isEmergency) {
            $patientBalance = $this->checkPatientBalance($data['patient_id'], $totalAmount);

            if (!$patientBalance['sufficient']) {
                throw new \Exception("Insufficient balance. Required: {$patientBalance['required']}, Available: {$patientBalance['available']}");
            }
        }

        // Process dispensation
        $dispensation = $this->pharmacyRepository->createDispensation([
            'patient_id' => $data['patient_id'],
            'prescription_id' => $data['prescription_id'] ?? null,
            'status' => $isEmergency ? 'pending_payment' : 'dispensed',
            'total_amount' => $totalAmount
        ], $dispensationItems);

        // Create bill for non-emergency
        if (!$isEmergency) {
            $this->createPharmacyBill($data['patient_id'], $dispensation['dispensation']->id, $totalAmount);
        }

        return $dispensation;
    }

    /**
     * Get dispensation history
     */
    public function getDispensationsList(array $filters = [])
    {
        $perPage = $filters['per_page'] ?? 15;
        return $this->pharmacyRepository->getDispensationsList($filters, $perPage);
    }

    /**
     * Get dispensation details
     */
    public function getDispensationDetails($id)
    {
        $result = $this->pharmacyRepository->getDispensationDetails($id);

        if (!$result) {
            throw new \Exception('Dispensation not found');
        }

        return $result;
    }

    /**
     * Receive new stock (purchase)
     */
    public function receiveStock(array $data)
    {
        $validator = Validator::make($data, [
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'invoice_number' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.drug_id' => 'required|integer|exists:drugs,id',
            'items.*.batch_number' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.purchase_price' => 'required|numeric|min:0',
            'items.*.selling_price' => 'required|numeric|min:0',
            'items.*.manufacturing_date' => 'nullable|date',
            'items.*.expiry_date' => 'required|date|after:today',
            'items.*.location' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $this->pharmacyRepository->receiveStock($data);
    }

    /**
     * Get stock movements
     */
    public function getStockMovements($drugId = null, array $filters = [])
    {
        return $this->pharmacyRepository->getStockMovements($drugId, $filters);
    }

    /**
     * Get pharmacy statistics
     */
    public function getStatistics($period = 'today')
    {
        return $this->pharmacyRepository->getStatistics($period);
    }

    /**
     * Validate drug data
     */
    private function validateDrug(array $data, $id = null)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'generic_name' => 'nullable|string|max:255',
            'category' => 'required|string|max:100',
            'manufacturer' => 'nullable|string|max:255',
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'dosage_form' => 'required|string|max:50',
            'strength' => 'required|string|max:50',
            'unit' => 'required|string|max:20',
            'selling_price' => 'required|numeric|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'reorder_level' => 'required|integer|min:0',
            'max_level' => 'nullable|integer|min:0',
            'requires_prescription' => 'boolean',
            'is_controlled' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string'
        ];

        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }
    }

    /**
     * Check patient balance
     */
    private function checkPatientBalance($patientId, $requiredAmount)
    {
        $bill = DB::table('bills')
            ->where('patient_id', $patientId)
            ->whereIn('payment_status', ['pending', 'partial'])
            ->latest()
            ->first();

        if (!$bill) {
            return [
                'sufficient' => false,
                'required' => $requiredAmount,
                'available' => 0
            ];
        }

        $available = $bill->paid_amount - $bill->total_amount;

        return [
            'sufficient' => $available >= $requiredAmount,
            'required' => $requiredAmount,
            'available' => $available
        ];
    }

    /**
     * Create pharmacy bill
     */
    private function createPharmacyBill($patientId, $dispensationId, $amount)
    {
        $billNumber = 'BILL' . date('Ymd') . str_pad(DB::table('bills')->count() + 1, 4, '0', STR_PAD_LEFT);

        DB::table('bills')->insert([
            'bill_number' => $billNumber,
            'patient_id' => $patientId,
            'billable_type' => 'dispensations',
            'billable_id' => $dispensationId,
            'bill_date' => today(),
            'subtotal' => $amount,
            'total_amount' => $amount,
            'paid_amount' => 0,
            'due_amount' => $amount,
            'payment_status' => 'pending',
            'created_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }
}
