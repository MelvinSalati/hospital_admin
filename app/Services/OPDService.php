<?php
// app/Services/OPDService.php

namespace App\Services;

use App\Repositories\OPDRepository;
use App\Repositories\PatientRepository;
use App\Repositories\BillingRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class OPDService
{
    protected $opdRepository;
    protected $patientRepository;
    protected $billingRepository;

    public function __construct(
        OPDRepository $opdRepository,
        PatientRepository $patientRepository,
        BillingRepository $billingRepository
    ) {
        $this->opdRepository = $opdRepository;
        $this->patientRepository = $patientRepository;
        $this->billingRepository = $billingRepository;
    }

    /**
     * Get all OPD patients with filters
     */
    public function getOPDList(array $filters = [])
    {
        $perPage = $filters['per_page'] ?? 15;
        return $this->opdRepository->getOPDList($filters, $perPage);
    }

    /**
     * Get single OPD patient
     */
    public function getOPDPatient($id)
    {
        $opd = $this->opdRepository->find($id);

        if (!$opd) {
            throw new \Exception('OPD patient not found');
        }

        return $opd;
    }

    /**
     * Create new OPD registration
     */
    public function createOPD(array $data)
    {
        // Validate data
        $validator = Validator::make($data, [
            'patient_id' => 'required|integer|exists:patients,id',
            'doctor_id' => 'required|integer|exists:users,id',
            'appointment_id' => 'nullable|integer|exists:appointments,id',
            'registration_date' => 'nullable|date',
            'registration_time' => 'nullable|date_format:H:i:s',
            'visit_type' => 'nullable|in:first_visit,follow_up,emergency',
            'complaints' => 'nullable|string',
            'symptoms' => 'nullable|string',
            'payment_mode' => 'required|in:Cash,Cheque,Insurance,Credit Card,Mobile Money',
            'standard_charge' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        // Check if patient exists and is not deleted
        $patient = DB::table('patients')
            ->where('id', $data['patient_id'])
            ->whereNull('deleted_at')
            ->first();

        if (!$patient) {
            throw new \Exception('Patient not found or deleted');
        }

        // Check payment rules (no service without payment unless emergency)
        $isEmergency = ($data['visit_type'] ?? '') === 'emergency';

        if (!$isEmergency && ($data['paid_amount'] ?? 0) < ($data['standard_charge'] - ($data['discount_amount'] ?? 0))) {
            throw new \Exception('Payment required before registration for non-emergency cases');
        }

        return $this->opdRepository->createOPD($data);
    }

    /**
     * Update OPD patient
     */
    public function updateOPD($id, array $data)
    {
        $opd = $this->opdRepository->find($id);

        if (!$opd) {
            throw new \Exception('OPD patient not found');
        }

        // Validate data
        $validator = Validator::make($data, [
            'doctor_id' => 'nullable|integer|exists:users,id',
            'status' => 'nullable|in:pending,checked_in,with_doctor,completed,cancelled,no_show',
            'complaints' => 'nullable|string',
            'symptoms' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $data['updated_at'] = now();

        DB::table('opd_registrations')
            ->where('id', $id)
            ->update($data);

        return $this->opdRepository->find($id);
    }

    /**
     * Check-in patient
     */
    public function checkIn($id)
    {
        $opd = $this->opdRepository->find($id);

        if (!$opd) {
            throw new \Exception('OPD patient not found');
        }

        if ($opd->status !== 'pending') {
            throw new \Exception('Patient already checked in or completed');
        }

        DB::table('opd_registrations')
            ->where('id', $id)
            ->update([
                'status' => 'checked_in',
                'check_in_time' => now(),
                'updated_at' => now()
            ]);

        return $this->opdRepository->find($id);
    }

    /**
     * Check-out patient (complete visit)
     */
    public function checkOut($id)
    {
        $opd = $this->opdRepository->find($id);

        if (!$opd) {
            throw new \Exception('OPD patient not found');
        }

        if ($opd->status === 'completed') {
            throw new \Exception('Patient already checked out');
        }

        DB::table('opd_registrations')
            ->where('id', $id)
            ->update([
                'status' => 'completed',
                'check_out_time' => now(),
                'updated_at' => now()
            ]);

        return $this->opdRepository->find($id);
    }

    /**
     * Cancel OPD visit
     */
    public function cancel($id, $reason = null)
    {
        $opd = $this->opdRepository->find($id);

        if (!$opd) {
            throw new \Exception('OPD patient not found');
        }

        DB::table('opd_registrations')
            ->where('id', $id)
            ->update([
                'status' => 'cancelled',
                'cancellation_reason' => $reason,
                'cancelled_at' => now(),
                'updated_at' => now()
            ]);

        return $this->opdRepository->find($id);
    }

    /**
     * Get OPD statistics
     */
    public function getStatistics($period = 'today')
    {
        return $this->opdRepository->getStatistics($period);
    }

    /**
     * Get today's OPD list
     */
    public function getTodayOPD()
    {
        return $this->opdRepository->findWhere([
            'registration_date' => today()->toDateString()
        ]);
    }

    /**
     * Get pending OPD list
     */
    public function getPendingOPD()
    {
        return $this->opdRepository->findWhere([
            'status' => 'pending'
        ]);
    }

    /**
     * Get patient visit history
     */
    public function getPatientVisits($patientId)
    {
        $patient = DB::table('patients')->find($patientId);

        if (!$patient) {
            throw new \Exception('Patient not found');
        }

        return $this->opdRepository->findWhere([
            'patient_id' => $patientId
        ]);
    }

    /**
     * Search OPD patients
     */
    public function search($query)
    {
        return DB::table('opd_registrations')
            ->join('patients', 'opd_registrations.patient_id', '=', 'patients.id')
            ->where('patients.first_name', 'like', "%{$query}%")
            ->orWhere('patients.last_name', 'like', "%{$query}%")
            ->orWhere('patients.patient_number', 'like', "%{$query}%")
            ->orWhere('opd_registrations.opd_number', 'like', "%{$query}%")
            ->whereNull('opd_registrations.deleted_at')
            ->limit(20)
            ->get();
    }
}
