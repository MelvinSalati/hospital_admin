<?php
// app/Services/LaboratoryService.php

namespace App\Services;

use App\Repositories\LaboratoryRepository;
use App\Repositories\PatientRepository;
use App\Repositories\BillingRepository;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class LaboratoryService extends BaseService
{
    protected $laboratoryRepository;
    protected $patientRepository;
    protected $billingRepository;

    public function __construct(
        LaboratoryRepository $laboratoryRepository,
        PatientRepository $patientRepository,
        BillingRepository $billingRepository
    ) {
        parent::__construct($laboratoryRepository);
        $this->laboratoryRepository = $laboratoryRepository;
        $this->patientRepository = $patientRepository;
        $this->billingRepository = $billingRepository;
    }

    /**
     * Get lab tests list
     */
    public function getLabTestsList(array $filters = [])
    {
        $perPage = $filters['per_page'] ?? 15;
        return $this->laboratoryRepository->getLabTestsList($filters, $perPage);
    }

    /**
     * Get lab panels list
     */
    public function getLabPanelsList(array $filters = [])
    {
        $perPage = $filters['per_page'] ?? 15;
        return $this->laboratoryRepository->getLabPanelsList($filters, $perPage);
    }

    /**
     * Get lab orders list
     */
    public function getLabOrdersList(array $filters = [])
    {
        $perPage = $filters['per_page'] ?? 15;
        return $this->laboratoryRepository->getLabOrdersList($filters, $perPage);
    }

    /**
     * Get lab order details
     */
    public function getLabOrderDetails($id)
    {
        $result = $this->laboratoryRepository->getLabOrderDetails($id);

        if (!$result) {
            throw new \Exception('Lab order not found');
        }

        return $result;
    }

    /**
     * Create lab order
     */
    public function createLabOrder(array $data)
    {
        $validator = Validator::make($data, [
            'patient_id' => 'required|integer|exists:patients,id',
            'doctor_id' => 'required|integer|exists:users,id',
            'consultation_id' => 'nullable|integer|exists:consultations,id',
            'test_ids' => 'required|array|min:1',
            'test_ids.*' => 'integer|exists:lab_tests,id',
            'priority' => 'nullable|in:routine,urgent,stat',
            'clinical_notes' => 'nullable|string',
            'is_emergency' => 'boolean',
            'emergency_notes' => 'required_if:is_emergency,true|string'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $isEmergency = $data['is_emergency'] ?? false;

        // Calculate total cost
        $totalCost = DB::table('lab_tests')
            ->whereIn('id', $data['test_ids'])
            ->sum('price');

        // Check payment for non-emergency
        if (!$isEmergency) {
            $patientBalance = $this->checkPatientBalance($data['patient_id'], $totalCost);

            if (!$patientBalance['sufficient']) {
                throw new \Exception("Insufficient balance. Required: {$patientBalance['required']}, Available: {$patientBalance['available']}");
            }
        }

        // Create order
        $order = $this->laboratoryRepository->createLabOrder([
            'patient_id' => $data['patient_id'],
            'doctor_id' => $data['doctor_id'],
            'consultation_id' => $data['consultation_id'] ?? null,
            'priority' => $data['priority'] ?? 'routine',
            'clinical_notes' => $data['clinical_notes'] ?? null,
            'is_emergency' => $isEmergency,
            'emergency_notes' => $data['emergency_notes'] ?? null
        ], $data['test_ids']);

        // Create bill for non-emergency
        if (!$isEmergency) {
            $this->createLabBill($data['patient_id'], $order['order']->id, $totalCost);
        }

        return $order;
    }

    /**
     * Add lab results
     */
    public function addLabResults($orderId, array $data)
    {
        $validator = Validator::make($data, [
            'results' => 'required|array|min:1',
            'results.*.test_id' => 'required|integer|exists:lab_order_items,id',
            'results.*.result_value' => 'required|string',
            'results.*.comments' => 'nullable|string',
            'results.*.flag' => 'nullable|in:normal,high,low,critical'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $order = $this->laboratoryRepository->getLabOrderDetails($orderId);

        if (!$order) {
            throw new \Exception('Lab order not found');
        }

        return $this->laboratoryRepository->addLabResults($orderId, $data['results']);
    }

    /**
     * Add specimen information
     */
    public function addSpecimen($orderId, array $data)
    {
        $validator = Validator::make($data, [
            'specimen_type' => 'required|string',
            'collection_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $order = $this->laboratoryRepository->getLabOrderDetails($orderId);

        if (!$order) {
            throw new \Exception('Lab order not found');
        }

        return $this->laboratoryRepository->addSpecimen($orderId, $data);
    }

    /**
     * Get lab statistics
     */
    public function getStatistics($period = 'today')
    {
        return $this->laboratoryRepository->getStatistics($period);
    }

    /**
     * Get tests by category
     */
    public function getTestsByCategory()
    {
        return DB::table('lab_tests')
            ->select('category', DB::raw('COUNT(*) as count'))
            ->whereNull('deleted_at')
            ->where('is_active', true)
            ->groupBy('category')
            ->get();
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
     * Create lab bill
     */
    private function createLabBill($patientId, $orderId, $amount)
    {
        $billNumber = 'BILL' . date('Ymd') . str_pad(DB::table('bills')->count() + 1, 4, '0', STR_PAD_LEFT);

        DB::table('bills')->insert([
            'bill_number' => $billNumber,
            'patient_id' => $patientId,
            'billable_type' => 'lab_orders',
            'billable_id' => $orderId,
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
