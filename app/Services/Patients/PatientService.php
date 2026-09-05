<?php

namespace App\Services\Patients;

use App\Repositories\Patients\PatientRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PatientService
{
    protected PatientRepository $patientRepository;
    /**
     * Create a new class instance.
     */
    public function __construct(PatientRepository $repository)
    {
        $this->patientRepository    = $repository;
    }

    public function searchPatient(array $searchDetails){
        return $this->patientRepository->search($searchDetails);
    }

    public function patient(string $patientUuid){
        return $this->patientRepository->getPatientDetails($patientUuid);
    }
    /**
     * Generate unique patient number
     */
    private function generatePatientNumber(): string
    {
        $prefix = 'AMH';
        $year = date('Y');
        $month = date('m');

        $latestPatient = $this->patientRepository->getLatestPatient($year, $month);

        if ($latestPatient) {
            $latestNumber = $latestPatient->patient_number;
            $sequence = intval(substr($latestNumber, -4)) + 1;
        } else {
            $sequence = 1;
        }

        return $prefix . $year . $month . str_pad($sequence, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Search patients via API with type filtering
     *
     * @param string $query The search query
     * @param string $type The search type (all, name, phone, email, id)
     * @param int $perPage Number of results per page
     * @return array
     */
    public function searchPatientsAPI($query,$type)
    {
        try {
            // Delegate the search to the repository
            $patients = $this->patientRepository->search($query, $type);

            return [
                'success' => true,
                'data' => $patients
            ];
        } catch (\Exception $e) {
            Log::error('API Patient search failed', [
                'query' => $query,
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }

    /**
     * Get patient by ID
     */
    public function getPatientById(int $id)
    {
        try {
            $patient = $this->patientRepository->find($id);

            if (!$patient) {
                return [
                    'success' => false,
                    'message' => 'Patient not found',
                    'status_code' => 404
                ];
            }

            return [
                'success' => true,
                'data' => $patient
            ];
        } catch (\Exception $e) {
            Log::error('Failed to fetch patient', [
                'patient_id' => $id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to fetch patient: ' . $e->getMessage(),
                'status_code' => 500
            ];
        }
    }

    /**
     * Update patient
     */
    public function updatePatient(int $id, array $data)
    {
        try {
            DB::beginTransaction();

            $patient = $this->patientRepository->find($id);

            if (!$patient) {
                return [
                    'success' => false,
                    'message' => 'Patient not found',
                    'status_code' => 404
                ];
            }

            // Handle profile photo upload
            if (isset($data['profile_photo']) && $data['profile_photo'] instanceof \Illuminate\Http\UploadedFile) {
                // Delete old photo if exists
                if ($patient->profile_photo) {
                    Storage::disk('public')->delete($patient->profile_photo);
                }
                $data['profile_photo_path'] = $data['profile_photo']->store('patients/photos', 'public');
                unset($data['profile_photo']);
            }

            // Map fields for update
            $updateData = $this->mapPatientFields($data);

            $updated = $this->patientRepository->update($id, $updateData);

            DB::commit();

            if ($updated) {
                $patient = $this->patientRepository->find($id);
                return [
                    'success' => true,
                    'message' => 'Patient updated successfully',
                    'data' => $patient
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update patient',
                'status_code' => 500
            ];
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Patient update failed', [
                'patient_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to update patient: ' . $e->getMessage(),
                'status_code' => 500
            ];
        }
    }
     private function mapPatientFields(array $data): array
    {
        return [
            'patient_number' => $data['patient_number'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'gender' => $data['gender'],
            'date_of_birth' => $data['date_of_birth'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'emergency_contact' => $data['emergency_contact'] ?? null,
            'emergency_phone' => $data['emergency_phone'] ?? null,
            'blood_group' => $data['blood_group'] ?? null,
            'allergies' => $data['allergies'] ?? null,
            'chronic_conditions' => $data['chronic_conditions'] ?? null,
            'current_medications' => $data['current_medications'] ?? null,
            'medical_history' => $data['medical_history'] ?? null,
            'surgical_history' => $data['surgical_history'] ?? null,
            'family_history' => $data['family_history'] ?? null,
            'marital_status' => $data['marital_status'] ?? null,
            'occupation' => $data['occupation'] ?? null,
            'nationality' => $data['nationality'] ?? 'Zambian',
            'id_type' => $data['id_type'] ?? null,
            'id_number' => $data['id_number'] ?? null,
            'insurance_provider' => $data['insurance_provider'] ?? null,
            'insurance_number' => $data['insurance_number'] ?? null,
            'insurance_expiry' => $data['insurance_expiry'] ?? null,
            'insurance_status' => $data['insurance_status'] ?? null,
            'next_of_kin_name' => $data['next_of_kin_name'] ?? null,
            'next_of_kin_relationship' => $data['next_of_kin_relationship'] ?? null,
            'next_of_kin_phone' => $data['next_of_kin_phone'] ?? null,
            'profile_photo' => $data['profile_photo_path'] ?? null,
            'status' => $data['status'] ?? 'active',

            // Biometrics - store as JSON if you have fingerprint columns
            'fingerprint_data' => json_encode([
                'right_thumb' => $data['fingerprint_right_thumb'] ?? null,
                'right_index' => $data['fingerprint_right_index'] ?? null,
                'right_middle' => $data['fingerprint_right_middle'] ?? null,
                'right_ring' => $data['fingerprint_right_ring'] ?? null,
                'right_little' => $data['fingerprint_right_little'] ?? null,
                'left_thumb' => $data['fingerprint_left_thumb'] ?? null,
                'left_index' => $data['fingerprint_left_index'] ?? null,
                'left_middle' => $data['fingerprint_left_middle'] ?? null,
                'left_ring' => $data['fingerprint_left_ring'] ?? null,
                'left_little' => $data['fingerprint_left_little'] ?? null,
            ]),
        ];
    }
}
