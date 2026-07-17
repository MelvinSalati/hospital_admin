<?php

namespace App\Models\Consultations;

use Illuminate\Database\Eloquent\Model;

class Consultation extends Model
{
    // Define which attributes can be mass-assigned.
    protected $fillable = [
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

    // Define the relationship with the patient.
    public function patient()
    {
        return $this->belongsTo(\App\Models\Patients\Patient::class, 'patient_id');
    }

   
}
