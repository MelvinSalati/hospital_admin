<?php

namespace App\Repositories\Patients;

use App\Models\Patients\Patient;

class PatientRepository
{
    public  function search(array $searchDetails)
    {

        $searchType  =  $searchDetails['search_type'];
        $searchValue =  $searchDetails['search_value'];

        switch ($searchType) {
            case 'phone':
                $search = $this->searchByPhoneNumber($searchValue);
                break;
            case 'name':
                $search = $this->searchByNames($searchValue);
                break;
            case 'nrc':
                $search = $this->searchByNrc($searchValue);
                break;
            case 'patient_number':
                $search = $this->searchByPatientIdentity($searchValue);
                break;

            default:
                $search = $this->searchByPatientIdentity($searchValue);
                break;
        }

        return $search;
    }
    public function searchByNames(string $searchValue)
    {
        $names = array_filter(
            preg_split('/\s+/', trim($searchValue))
        );

        if (empty($names)) {
            return collect();
        }

        return Patient::query()
            ->where(function ($query) use ($names) {
                foreach ($names as $name) {
                    $query->where(function ($subQuery) use ($name) {
                        $subQuery->where('first_name', 'LIKE', "%{$name}%")
                            ->orWhere('last_name', 'LIKE', "%{$name}%");
                    });
                }
            })
            ->get($this->allowedFields());
    }
    public function searchByPatientIdentity(string $searchValue)
    {
        $patients = Patient::query()
            ->where(function ($query) use ($searchValue) {
                $query->where('patient_number', 'LIKE', "%{$searchValue}%");
            })
            ->get($this->allowedFields());
        return $patients;
    }
    /**
     * Find patient by ID
     */
    public function find(int $id): ?Patient
    {
        return Patient::findOrFail($id);
    }
    public function update(int $id, array $data): bool
    {
        $patient = Patient::ind($id);
        if ($patient) {
            return $patient->update($data);
        }
        return false;
    }

    public function getPatientDetails(string $uuid)
    {
        return Patient::with([
            'interaction',
            'vitalSign',
            'laboratory',
            'prescription'
        ])
            ->select([
                'id',
                'patient_uuid',
                'patient_number',
                'first_name',
                'last_name',
                'gender',
                'date_of_birth',
                'phone',
                'email',
                'address',
                'blood_group',
                'marital_status',
                'occupation',
                'nationality',
                'id_type',
                'id_number',
                'insurance_provider',
                'insurance_number',
                'insurance_expiry',
                'insurance_status',
                'status',
                'profile_photo',
                'created_at',
                'updated_at'
            ])
            ->orWhere('id', $uuid)
            ->first();
    }

    public function searchByNrc(string $searchValue)
    {
        $patients = Patient::query()
            ->where(function ($query) use ($searchValue) {
                $query->where('nrc_number', 'LIKE', "%{$searchValue}%");
            })
            ->get($this->allowedFields());
        return $patients;
    }
    public function searchByPhoneNumber(string $searchValue)
    {
        $patients = Patient::query()
            ->where(function ($query) use ($searchValue) {
                $query->where('phone', 'LIKE', "%{$searchValue}%");
            })
            ->get($this->allowedFields());
        return $patients;
    }

    protected function allowedFields()
    {
        return [
            'patient_number',
            'first_name',
            'last_name',
            'date_of_birth',
            'phone',
            'id',
            'profile_photo',
            'status',
            'created_at',
            'patient_uuid'

        ];
    }

    public function patientDetails(int $patientId): Patient
    {
        return Patient::query()
            ->select([
                'email',
                'first_name',
                'last_name',
                'phone_number',
            ])
            ->findOrFail($patientId);
    }
}
