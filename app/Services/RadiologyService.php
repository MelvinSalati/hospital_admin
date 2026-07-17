<?php
// app/Services/RadiologyService.php

namespace App\Services;

use App\Repositories\RadiologyRepository;
use App\Repositories\PatientRepository;
use App\Repositories\BillingRepository;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class RadiologyService extends BaseService
{
    protected $radiologyRepository;
    protected $patientRepository;
    protected $billingRepository;

    public function __construct(
        RadiologyRepository $radiologyRepository,
        PatientRepository $patientRepository,
        BillingRepository $billingRepository
    ) {
        parent::__construct($radiologyRepository);
        $this->radiologyRepository = $radiologyRepository;
        $this->patientRepository = $patientRepository;
        $this->billingRepository = $billingRepository;
    }

    /**
     * Get procedures list
     */
    public function getProceduresList(array $filters = [])
    {
        $perPage = $filters['per_page'] ?? 15;
        return $this->radiologyRepository->getProceduresList($filters, $perPage);
    }

    /**
     * Get orders list
     */
    public function getOrdersList(array $filters = [])
    {
        $perPage = $filters['per_page'] ?? 15;
        return $this->radiologyRepository->getOrdersList($filters, $perPage);
    }

    /**
     * Get order details
     */
    public function getOrderDetails($id)
    {
        $result = $this->radiologyRepository->getOrderDetails($id);

        if (!$result) {
            throw new \Exception('Radiology order not found');
        }

        return $result;
    }

    /**
     * Create radiology order
     */
    public function createOrder(array $data)
    {
        $validator = Validator::make($data, [
            'patient_id' => 'required|integer|exists:patients,id',
            'doctor_id' => 'required|integer|exists:users,id',
            'consultation_id' => 'nullable|integer|exists:consultations,id',
            'procedure_ids' => 'required|array|min:1',
            'procedure_ids.*' => 'integer|exists:radiology_procedures,id',
            'priority' => 'nullable|in:routine,urgent,stat',
            'clinical_history' => 'nullable|string',
            'reason_for_exam' => 'nullable|string',
            'is_emergency' => 'boolean',
            'emergency_notes' => 'required_if:is_emergency,true|string'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $isEmergency = $data['is_emergency'] ?? false;

        // Calculate total cost
        $totalCost = DB::table('radiology_procedures')
            ->whereIn('id', $data['procedure_ids'])
            ->sum('price');

        // Check payment for non-emergency
        if (!$isEmergency) {
            $patientBalance = $this->checkPatientBalance($data['patient_id'], $totalCost);

            if (!$patientBalance['sufficient']) {
                throw new \Exception("Insufficient balance. Required: {$patientBalance['required']}, Available: {$patientBalance['available']}");
            }
        }

        // Create order
        $order = $this->radiologyRepository->createOrder([
            'patient_id' => $data['patient_id'],
            'doctor_id' => $data['doctor_id'],
            'consultation_id' => $data['consultation_id'] ?? null,
            'priority' => $data['priority'] ?? 'routine',
            'clinical_history' => $data['clinical_history'] ?? null,
            'reason_for_exam' => $data['reason_for_exam'] ?? null,
            'is_emergency' => $isEmergency,
            'emergency_notes' => $data['emergency_notes'] ?? null
        ], $data['procedure_ids']);

        // Create bill for non-emergency
        if (!$isEmergency) {
            $this->createRadiologyBill($data['patient_id'], $order['order']->id, $totalCost);
        }

        return $order;
    }

    /**
     * Add radiology results
     */
    public function addResults($orderId, array $data, array $images = [])
    {
        $validator = Validator::make($data, [
            'findings' => 'required|string',
            'impression' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'radiologist_id' => 'required|integer|exists:users,id'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $order = $this->radiologyRepository->getOrderDetails($orderId);

        if (!$order) {
            throw new \Exception('Radiology order not found');
        }

        return $this->radiologyRepository->addResults($orderId, $data, $images);
    }

    /**
     * Get statistics
     */
    public function getStatistics($period = 'today')
    {
        return $this->radiologyRepository->getStatistics($period);
    }

    /**
     * Get procedures by modality
     */
    public function getProceduresByModality()
    {
        return DB::table('radiology_procedures')
            ->select('modality', DB::raw('COUNT(*) as count'))
            ->whereNull('deleted_at')
            ->where('is_active', true)
            ->groupBy('modality')
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
     * Create radiology bill
     */
    private function createRadiologyBill($patientId, $orderId, $amount)
    {
        $billNumber = 'BILL' . date('Ymd') . str_pad(DB::table('bills')->count() + 1, 4, '0', STR_PAD_LEFT);

        DB::table('bills')->insert([
            'bill_number' => $billNumber,
            'patient_id' => $patientId,
            'billable_type' => 'radiology_orders',
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
