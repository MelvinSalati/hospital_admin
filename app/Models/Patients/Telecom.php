<?php
// app/Models/Patients/PatientTelecom.php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;

class Telecom extends Model
{
    protected $table = 'telecoms';

    protected $fillable = [
        'patient_id', 'system', 'value', 'use', 'rank', 'period_start', 'period_end'
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