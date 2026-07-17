<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Consultation extends Model
{
    protected $fillable = [
        'admission_number',
        'visit_token',
        'consultation_uuid',
        'patient_id',
        'doctors_id',
        'chief_complaints',
        'clinical_analysis',
        'drug_history',
        'health_education',
        'imaging_orders',
        'lab_orders',
        'medical_conditions',
        'physical_exam',
        'prescription',
        'status',
        'submitted_at'
    ];

    protected $casts = [
        'submitted_at'       => 'datetime',
        'chief_complaints'   => 'array',
        'clinical_analysis'  => 'array',
        'drug_history'       => 'array',
        'health_education'   => 'array',
        'imaging_orders'     => 'array',
        'lab_orders'         => 'array',
        'medical_conditions' => 'array',
        'physical_exam'      => 'array',
        'prescription'       => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($consultation) {

            // UUID
            if (empty($consultation->consultation_uuid)) {
                $consultation->consultation_uuid = (string) Str::uuid();
            }

            // Doctor auto-assign
            if (empty($consultation->doctors_id)) {
                $consultation->doctors_id = auth()->id();
            }
        });
    } 

    public function patient()
    {
        return $this->belongsTo(\App\Models\Patients\Patient::class, 'patient_id');
    }

     public function doctor()
    {
        return $this->belongsTo(\App\Models\User::class, 'doctors_id');     
    }
    public function diagnoses()
    {
        return $this->hasMany(\App\Models\ICD10Dx\Diagnosis::class, 'consultation_uuid', 'consultation_uuid');
    }
}
