<?php

namespace App\Models\ICD10Dx;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Diagnosis extends Model
{
    // Table name (optional if Laravel naming conventions match)
    protected $table = 'diagnoses';

    // Fillable fields
    protected $fillable = [
        'diagnosis_uuid',
        'patient_id',
        'consultation_uuid',
        'diagnosis',
        'icd10_code',
        'diagnosed_date',
        'status',
        'notes',
    ];

    // Casts
    protected $casts = [
        'diagnosed_date' => 'date',
        'status' => 'string',
    ];

    // Automatically set UUID on creating
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($diagnosis) {
            if (empty($diagnosis->diagnosis_uuid)) {
                $diagnosis->diagnosis_uuid = (string) Str::uuid();
            }
        });
    }

    // Relationships
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class, 'consultation_uuid', 'consultation_uuid');
    }
}
