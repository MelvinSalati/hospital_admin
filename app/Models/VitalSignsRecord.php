<?php
// app/Models/VitalSignsRecord.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VitalSignsRecord extends Model
{
    protected $table = 'vital_signs_records'; // Adjust table name as needed

    protected $fillable = [
        'admission_number',
        'visit_token',
        'vital_sign_uuid',
        'patient_id',
        'consultation_uuid',
        'temperature',
        'pulse',
        'bp_systolic',
        'bp_diastolic',
        'oxygen_saturation',
        'weight',
        'notes',
        'recorded_by',
        'recorded_at'
    ];

    protected $casts = [
        'temperature' => 'float',
        'pulse' => 'integer',
        'bp_systolic' => 'integer',
        'bp_diastolic' => 'integer',
        'oxygen_saturation' => 'integer',
        'weight' => 'float',
        'recorded_at' => 'datetime',
    ];

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
