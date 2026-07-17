<?php

namespace App\DTOs;

class PatientDTO
{
    public function __construct(
        public readonly ?string $patient_number,
        public readonly string $first_name,
        public readonly string $last_name,
        public readonly string $gender,
        public readonly string $date_of_birth,
        public readonly ?string $phone,
        public readonly ?string $email,
        public readonly ?string $address,
        public readonly ?string $emergency_contact,
        public readonly ?string $emergency_phone,
        public readonly ?string $blood_group,
        public readonly ?string $allergies,
        public readonly ?string $chronic_conditions,
        public readonly ?string $current_medications,
        public readonly ?string $medical_history,
        public readonly ?string $surgical_history,
        public readonly ?string $family_history,
        public readonly ?string $marital_status,
        public readonly ?string $occupation,
        public readonly string $nationality = 'Zambian',
        public readonly ?string $id_type,
        public readonly ?string $id_number,
        public readonly ?string $insurance_provider,
        public readonly ?string $insurance_number,
        public readonly ?string $insurance_expiry,
        public readonly ?string $insurance_status,
        public readonly ?string $next_of_kin_name,
        public readonly ?string $next_of_kin_relationship,
        public readonly ?string $next_of_kin_phone,
        public readonly ?string $profile_photo,
        public readonly string $status = 'active'
    ) {}

    public static function validationRules(): array
    {
        return [
            // Personal Information
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'gender' => 'required|in:male,female',
            'date_of_birth' => 'required|date|before:today',
            'address' => 'nullable|string',

            // Emergency Contact
            'emergency_contact' => 'nullable|string|max:255',
            'emergency_phone' => 'nullable|string|max:10',

            // Medical Information
            'blood_group' => 'nullable|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'allergies' => 'nullable|string',
            'chronic_conditions' => 'nullable|string',
            'current_medications' => 'nullable|string',
            'medical_history' => 'nullable|string',
            'surgical_history' => 'nullable|string',
            'family_history' => 'nullable|string',

            // Demographic Information
            'marital_status' => 'nullable|in:single,married,divorced,widowed',
            'occupation' => 'nullable|string|max:255',
            'nationality' => 'nullable|string|max:100',

            // Identification
            'id_type' => 'nullable|in:national_id,passport,driving_license',
            'id_number' => 'nullable|string|max:15',

            // Insurance Information
            'insurance_provider' => 'nullable|string|max:255',
            'insurance_number' => 'nullable|string|max:255',
            'insurance_expiry' => 'nullable|date|after:today',
            'insurance_status' => 'nullable|in:active,expired,pending',

            // Next of Kin
            'next_of_kin_name' => 'nullable|string|max:255',
            'next_of_kin_relationship' => 'nullable|string|max:255',
            'next_of_kin_phone' => 'nullable|string|max:10',

            // Profile Photo
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',

            // Status
            'status' => 'nullable|in:active,inactive,deceased'
        ];
    }

    public static function fromRequest(array $data): self
    {
        return new self(
            patient_number: $data['patient_number'] ?? null,
            first_name: $data['first_name'],
            last_name: $data['last_name'],
            gender: $data['gender'],
            date_of_birth: $data['date_of_birth'],
            phone: $data['phone'] ?? null,
            email: $data['email'] ?? null,
            address: $data['address'] ?? null,
            emergency_contact: $data['emergency_contact'] ?? null,
            emergency_phone: $data['emergency_phone'] ?? null,
            blood_group: $data['blood_group'] ?? null,
            allergies: $data['allergies'] ?? null,
            chronic_conditions: $data['chronic_conditions'] ?? null,
            current_medications: $data['current_medications'] ?? null,
            medical_history: $data['medical_history'] ?? null,
            surgical_history: $data['surgical_history'] ?? null,
            family_history: $data['family_history'] ?? null,
            marital_status: $data['marital_status'] ?? null,
            occupation: $data['occupation'] ?? null,
            nationality: $data['nationality'] ?? 'Rwandan',
            id_type: $data['id_type'] ?? null,
            id_number: $data['id_number'] ?? null,
            insurance_provider: $data['insurance_provider'] ?? null,
            insurance_number: $data['insurance_number'] ?? null,
            insurance_expiry: $data['insurance_expiry'] ?? null,
            insurance_status: $data['insurance_status'] ?? null,
            next_of_kin_name: $data['next_of_kin_name'] ?? null,
            next_of_kin_relationship: $data['next_of_kin_relationship'] ?? null,
            next_of_kin_phone: $data['next_of_kin_phone'] ?? null,
            profile_photo: $data['profile_photo'] ?? null,
            status: $data['status'] ?? 'active'
        );
    }
    // Add this to your PatientDTO class
    public static function fromModel($patient): self
    {
        return new self(
            patient_number: $patient->patient_number,
            first_name: $patient->first_name,
            last_name: $patient->last_name,
            gender: $patient->gender,
            date_of_birth: $patient->date_of_birth,
            phone: $patient->phone,
            email: $patient->email,
            address: $patient->address,
            emergency_contact: $patient->emergency_contact,
            emergency_phone: $patient->emergency_phone,
            blood_group: $patient->blood_group,
            allergies: $patient->allergies,
            chronic_conditions: $patient->chronic_conditions,
            current_medications: $patient->current_medications,
            medical_history: $patient->medical_history,
            surgical_history: $patient->surgical_history,
            family_history: $patient->family_history,
            marital_status: $patient->marital_status,
            occupation: $patient->occupation,
            nationality: $patient->nationality,
            id_type: $patient->id_type,
            id_number: $patient->id_number,
            insurance_provider: $patient->insurance_provider,
            insurance_number: $patient->insurance_number,
            insurance_expiry: $patient->insurance_expiry,
            insurance_status: $patient->insurance_status,
            next_of_kin_name: $patient->next_of_kin_name,
            next_of_kin_relationship: $patient->next_of_kin_relationship,
            next_of_kin_phone: $patient->next_of_kin_phone,
            profile_photo: $patient->profile_photo,
            status: $patient->status
        );
    }
    public function toArray(): array
    {
        return get_object_vars($this);
    }

    public function fullName(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function hasInsurance(): bool
    {
        return !empty($this->insurance_provider) && !empty($this->insurance_number);
    }
}
