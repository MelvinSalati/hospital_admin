<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PatientVisitScheme extends Model
{
    

    protected $table = 'patient_visit_schemes';

    protected $fillable = [
        'uuid',
        'token',
        'patient_visit_id',
        'scheme_id',
        'scheme_number',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
