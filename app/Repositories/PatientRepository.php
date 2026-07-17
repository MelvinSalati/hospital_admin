<?php

namespace App\Repositories;

use App\Models\Patients\Patient;
use App\Models\Patients\VitalSign;
use App\Repositories\Contracts\PatientRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class PatientRepository implements PatientRepositoryInterface
{
    protected $model;

    public function __construct(Patient $patient)
    {
        $this->model = $patient;
    }

    /**
     * Get all patients
     */
    public function all(array $columns = ['*']): Collection
    {
        return $this->model->select($columns)->get();
    }

    /**
     * Paginate patients
     */
    public function paginate(int $perPage = 15, array $columns = ['*']): LengthAwarePaginator
    {
        return $this->model->select($columns)->paginate($perPage);
    }

    /**
     * Find patient by ID
     */
    public function find(int $id): ?Patient
    {
        return $this->model->find($id);
    }

    /**
     * Find patient by unique patient_number
     */
    public function findByPatientNumber(string $patientNumber): ?Patient
    {
        return $this->model->where('patient_number', $patientNumber)->first();
    }

    /**
     * Create a new patient
     */
    public function create(array $data): Patient
    {
        return $this->model->create($data);
    }

    /**
     * Update an existing patient
     */
    public function update(int $id, array $data): bool
    {
        $patient = $this->find($id);
        if ($patient) {
            return $patient->update($data);
        }
        return false;
    }

    /**
     * Delete a patient (soft delete)
     */
    public function delete(int $id): bool
    {
        $patient = $this->find($id);
        if ($patient) {
            return $patient->delete();
        }
        return false;
    }

    /**
     * Restore a soft-deleted patient
     */
    public function restore(int $id): bool
    {
        $patient = $this->model->withTrashed()->find($id);
        if ($patient && $patient->trashed()) {
            return $patient->restore();
        }
        return false;
    }

    /**
     * Search patients by type (name, phone, email, id)
     */
    public function search(string $query, string $type = 'all')
    {
        return $this->model->where('phone', 'like', "%{$query}%")
            ->orWhere('email', $query)
            ->orWhere('patient_number', $query)
            ->get();
    }

    /**
     * Get the latest patient for a given year and month
     */
    public function getLatestPatient(int $year, int $month): ?Patient
    {
        return $this->model
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();
    }

    /**
     * Get patients by insurance provider
     */
    public function getByInsuranceProvider(string $provider, ?string $status = null, int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->where('insurance_provider', $provider);

        if ($status) {
            $query->where('insurance_status', $status);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * Get patients with expiring insurance
     */
    public function getExpiringInsurance(int $days = 30): Collection
    {
        $expiryDate = now()->addDays($days);

        return $this->model
            ->where('insurance_status', 'active')
            ->whereDate('insurance_expiry', '<=', $expiryDate)
            ->orderBy('insurance_expiry', 'asc')
            ->get();
    }

    /**
     * Get patient statistics
     */
    public function getStatistics(): array
    {
        return [
            'total' => $this->model->count(),
            'active' => $this->model->where('status', 'active')->count(),
            'inactive' => $this->model->where('status', 'inactive')->count(),
            'deceased' => $this->model->where('status', 'deceased')->count(),
            'male' => $this->model->where('gender', 'male')->count(),
            'female' => $this->model->where('gender', 'female')->count(),
            'other' => $this->model->where('gender', 'other')->count(),
            'registered_today' => $this->model->whereDate('created_at', today())->count(),
            'registered_this_month' => $this->model
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
        ];
    }

    /**
     * Get patients by date range
     */
    public function getByDateRange(string $startDate, string $endDate, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get patients by status
     */
    public function getByStatus(string $status, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model
            ->where('status', $status)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Count patients by gender
     */
    public function countByGender(): array
    {
        return [
            'male' => $this->model->where('gender', 'male')->count(),
            'female' => $this->model->where('gender', 'female')->count(),
            'other' => $this->model->where('gender', 'other')->count(),
        ];
    }

    /**
     * Get recent patients
     */
    public function getRecent(int $limit = 10): Collection
    {
        return $this->model
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get patient's vital signs
     * @param int $patientId
     * @return Collection
     */
    public function getVitalSigns($patientId)
    {
        return VitalSign::where('patient_id', $patientId)
            ->orderBy('recorded_at', 'desc')
            ->with('recorder')
            ->get();
    }

    /**
     * Create patient vital signs
     * @param array $patientData
     * @param int $patientId
     * @return VitalSign
     */
    public function createPatientVitals(array $patientData, int $patientId)
    {
        $data = array_merge($patientData, [
            'patient_id' => $patientId,
            'recorded_by' => auth()->id()
        ]);

        return VitalSign::create($data);
    } 

    public function queuePatient(array $data){
        return \App\Models\Queue::create($data);
    }

    public function getPatientId($patientNumber){
        return \App\Models\Patients\Patient::where('patient_number', $patientNumber)
        ->value('id');
    }
}