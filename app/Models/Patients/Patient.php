<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use SoftDeletes;

    // Table name (optional if matches convention)
    protected $table = 'patients';

    // Mass assignable fields
    protected $fillable = [
        'patient_number',
        'first_name',
        'last_name',
        'gender',
        'date_of_birth',
        'phone',
        'email',
        'address',
        'emergency_contact',
        'emergency_phone',
        'blood_group',
        'allergies',
        'chronic_conditions',
        'current_medications',
        'medical_history',
        'surgical_history',
        'family_history',
        'marital_status',
        'occupation',
        'nationality',
        'id_type',
        'id_number',
        'insurance_provider',
        'insurance_number',
        'insurance_expiry',
        'insurance_status',
        'next_of_kin_name',
        'next_of_kin_relationship',
        'next_of_kin_phone',
        'profile_photo',
        'status',
    ];

    // Attribute casting
    protected $casts = [
        'date_of_birth' => 'date',
        'insurance_expiry' => 'date',
        'allergies' => 'array',
        'chronic_conditions' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Default values for attributes
    protected $attributes = [
        'nationality' => 'Zambian',
        'status' => 'active',
    ];

    /**
     * Full name accessor
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    /**
     * Relationship: Patient has many bills
     */
    // public function bills()
    // {
    //     return $this->hasMany(\App\Models\Billing\Bill::class, 'patient_id');
    // }

    /**
     * Relationship: Patient has many admissions
     */
    // public function admissions()
    // {
    //     return $this->hasMany(\App\Models\Admissions\Admission::class, 'patient_id');
    // }

    /**
     * Relationship: Patient's created user (optional)
     */
    public function createdBy()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    /**
     * Relationship: Patient's registered user
     */
    public function registeredBy()
    {
        return $this->belongsTo(\App\Models\User::class, 'registered_by');
    }

    /**
     * Scope: Active patients
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Search by name, patient number, email, or phone
     */
    public function scopeSearch($query, string $term)
    {
        return $query->where('first_name', 'like', "%{$term}%")
            ->orWhere('last_name', 'like', "%{$term}%")
            ->orWhere('patient_number', 'like', "%{$term}%")
            ->orWhere('email', 'like', "%{$term}%")
            ->orWhere('phone', 'like', "%{$term}%");
    }

    // Relationships
    public function telecom()
    {
        return $this->hasMany(Telecom::class, 'patient_id');
    }

    public function identifiers()
    {
        return $this->hasMany(Identifier::class, 'patient_id');
    }
}
