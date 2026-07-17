<?php
// app/Models/Patients/PatientIdentifier.php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;

class Identifier extends Model
{
    protected $table = 'identifiers';

    protected $fillable = [
        'patient_id',
        'use',
        'type_code',
        'type_system',
        'type_display',
        'system',
        'value',
        'period_start',
        'period_end',
        'assigner_display'
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date'
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
