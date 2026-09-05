<?php

namespace App\Repositories;

use App\Models\Patients\Patient;
use App\Models\Patients\VitalSign;
use App\Repositories\Contracts\PatientRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class PatientRepository
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
        return Patient::findOrFail($id);
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
     * Search patients by various criteria
     * 
     * @param string $query The search term
     * @param string $type The search type (all, name, phone, email, patient_number, id_number, nrc, passport)
     * @param string $status Filter by status (all, active, inactive)
     * @param int $perPage Results per page (0 for all)
     * @return Collection|LengthAwarePaginator
     */
    public function search(string $query, string $type = 'all', string $status = 'all', int $perPage = 0)
    {
        $patientQuery = $this->model->newQuery();

        // Apply status filter
        if ($status !== 'all') {
            $patientQuery->where('status', $status);
        }

        // Only apply search if query is not empty
        if (!empty($query)) {
            switch ($type) {
                case 'all':
                    $patientQuery->where(function ($q) use ($query) {
                        $q->where('patient_number', 'LIKE', "%{$query}%")
                            ->orWhere('first_name', 'LIKE', "%{$query}%")
                            ->orWhere('last_name', 'LIKE', "%{$query}%")
                            ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$query}%")
                            ->orWhere('phone', 'LIKE', "%{$query}%")
                            ->orWhere('email', 'LIKE', "%{$query}%")
                            ->orWhere('id_number', 'LIKE', "%{$query}%")
                            ->orWhere('emergency_phone', 'LIKE', "%{$query}%")
                            ->orWhere('address', 'LIKE', "%{$query}%")
                            ->orWhere('nationality', 'LIKE', "%{$query}%")
                            ->orWhere('occupation', 'LIKE', "%{$query}%");
                    });
                    break;

                case 'name':
                    $patientQuery->where(function ($q) use ($query) {
                        $q->where('first_name', 'LIKE', "%{$query}%")
                            ->orWhere('last_name', 'LIKE', "%{$query}%")
                            ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$query}%");
                    });
                    break;

                case 'phone':
                    $patientQuery->where('phone', 'LIKE', "%{$query}%");
                    break;

                case 'email':
                    $patientQuery->where('email', 'LIKE', "%{$query}%");
                    break;

                case 'patient_number':
                    $patientQuery->where('patient_number', 'LIKE', "%{$query}%");
                    break;

                case 'id_number':
                    $patientQuery->where('id_number', 'LIKE', "%{$query}%");
                    break;

                case 'nrc':
                    $patientQuery->where(function ($q) use ($query) {
                        $q->where('id_type', 'LIKE', '%national_id%')
                            ->orWhere('id_type', 'LIKE', '%nrc%')
                            ->orWhere('id_type', 'LIKE', '%NRC%');
                    })->where('id_number', 'LIKE', "%{$query}%");
                    break;

                case 'passport':
                    $patientQuery->where('id_type', 'LIKE', '%passport%')
                        ->where('id_number', 'LIKE', "%{$query}%");
                    break;

                case 'national_id':
                    $patientQuery->where('id_type', 'LIKE', '%national_id%')
                        ->where('id_number', 'LIKE', "%{$query}%");
                    break;

                case 'alt_phone':
                    $patientQuery->where('emergency_phone', 'LIKE', "%{$query}%");
                    break;

                case 'id_type':
                    $patientQuery->where('id_type', 'LIKE', "%{$query}%");
                    break;

                default:
                    // Fallback to basic search
                    $patientQuery->where(function ($q) use ($query) {
                        $q->where('phone', 'LIKE', "%{$query}%")
                            ->orWhere('email', 'LIKE', "%{$query}%")
                            ->orWhere('patient_number', 'LIKE', "%{$query}%")
                            ->orWhere('first_name', 'LIKE', "%{$query}%")
                            ->orWhere('last_name', 'LIKE', "%{$query}%");
                    });
                    break;
            }
        }

        // Order by created_at descending
        $patientQuery->orderBy('created_at', 'desc');

        // Return paginated or collection
        if ($perPage > 0) {
            return $patientQuery->paginate($perPage);
        }

        return $patientQuery->get();
    }

    /**
     * Advanced search with multiple criteria
     */
    public function advancedSearch(array $criteria, int $perPage = 0)
    {
        $query = $this->model->newQuery();

        // Apply each criterion
        foreach ($criteria as $field => $value) {
            if (empty($value)) continue;

            switch ($field) {
                case 'search':
                    $query->where(function ($q) use ($value) {
                        $q->where('patient_number', 'LIKE', "%{$value}%")
                            ->orWhere('first_name', 'LIKE', "%{$value}%")
                            ->orWhere('last_name', 'LIKE', "%{$value}%")
                            ->orWhere('phone', 'LIKE', "%{$value}%")
                            ->orWhere('email', 'LIKE', "%{$value}%")
                            ->orWhere('id_number', 'LIKE', "%{$value}%");
                    });
                    break;

                case 'first_name':
                    $query->where('first_name', 'LIKE', "%{$value}%");
                    break;

                case 'last_name':
                    $query->where('last_name', 'LIKE', "%{$value}%");
                    break;

                case 'patient_number':
                    $query->where('patient_number', 'LIKE', "%{$value}%");
                    break;

                case 'phone':
                    $query->where('phone', 'LIKE', "%{$value}%");
                    break;

                case 'email':
                    $query->where('email', 'LIKE', "%{$value}%");
                    break;

                case 'id_type':
                    $query->where('id_type', 'LIKE', "%{$value}%");
                    break;

                case 'id_number':
                    $query->where('id_number', 'LIKE', "%{$value}%");
                    break;

                case 'blood_group':
                    $query->where('blood_group', $value);
                    break;

                case 'nationality':
                    $query->where('nationality', 'LIKE', "%{$value}%");
                    break;

                case 'marital_status':
                    $query->where('marital_status', $value);
                    break;

                case 'occupation':
                    $query->where('occupation', 'LIKE', "%{$value}%");
                    break;

                case 'status':
                    $query->where('status', $value);
                    break;

                case 'gender':
                    $query->where('gender', $value);
                    break;

                case 'insurance_provider':
                    $query->where('insurance_provider', 'LIKE', "%{$value}%");
                    break;

                case 'date_from':
                    $query->whereDate('created_at', '>=', $value);
                    break;

                case 'date_to':
                    $query->whereDate('created_at', '<=', $value);
                    break;
            }
        }

        $query->orderBy('created_at', 'desc');

        if ($perPage > 0) {
            return $query->paginate($perPage);
        }

        return $query->get();
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
     */
    public function getVitalSigns($patientId): Collection
    {
        return VitalSign::where('patient_id', $patientId)
            ->orderBy('recorded_at', 'desc')
            ->with('recorder')
            ->get();
    }

    /**
     * Create patient vital signs
     */
    public function createPatientVitals(array $patientData, int $patientId): VitalSign
    {
        $data = array_merge($patientData, [
            'patient_id' => $patientId,
            'recorded_by' => auth()->id()
        ]);

        return VitalSign::create($data);
    }

    /**
     * Queue a patient
     */
    public function queuePatient(array $data)
    {
        return \App\Models\Queue::create($data);
    }

    /**
     * Get patient ID by patient number
     */
    public function getPatientId($patientNumber)
    {
        return $this->model
            ->where('patient_number', $patientNumber)
            ->value('id');
    }

    /**
     * Search patients by name (first or last)
     */
    public function searchByName(string $name, int $perPage = 0)
    {
        $query = $this->model->where('first_name', 'LIKE', "%{$name}%")
            ->orWhere('last_name', 'LIKE', "%{$name}%")
            ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$name}%")
            ->orderBy('created_at', 'desc');

        return $perPage > 0 ? $query->paginate($perPage) : $query->get();
    }

    /**
     * Search patients by phone number
     */
    public function searchByPhone(string $phone, int $perPage = 0)
    {
        $query = $this->model->where('phone', 'LIKE', "%{$phone}%")
            ->orWhere('emergency_phone', 'LIKE', "%{$phone}%")
            ->orderBy('created_at', 'desc');

        return $perPage > 0 ? $query->paginate($perPage) : $query->get();
    }

    /**
     * Search patients by ID number (NRC, Passport, National ID)
     */
    public function searchByIdNumber(string $idNumber, ?string $idType = null, int $perPage = 0)
    {
        $query = $this->model->where('id_number', 'LIKE', "%{$idNumber}%");

        if ($idType) {
            $query->where('id_type', $idType);
        }

        $query->orderBy('created_at', 'desc');

        return $perPage > 0 ? $query->paginate($perPage) : $query->get();
    }
}
