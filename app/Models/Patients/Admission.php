<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use App\Models\Patients\Patient;
use App\Models\User;
use Illuminate\Support\Str;

class Admission extends Model
{
    protected $fillable = [
        'admission_uuid',
        'admission_number', // <-- add this
        'patient_id',
        'visit_token',
        'admitted_by',
        'doctor_id',
        'diagnosis_on_admission',
        'diagnosis_on_discharge',
        'date_of_admission',
        'time_of_admission'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($admission) {
            // Generate UUID if missing
            if (empty($admission->admission_uuid)) {
                $admission->admission_uuid = (string) Str::uuid();
            }

            // Generate Admission Number if missing
            if (empty($admission->admission_number)) {
                $admission->admission_number = self::generateAdmissionNumber();
            }
        });
    }

    // Generate a unique Admission Number
    public static function generateAdmissionNumber()
    {
        // Format: ADM-YYYYMMDD-XXXX (random 4 digits)
        $datePart = date('Ymd');
        $randomPart = mt_rand(1000, 9999);

        return 'ADM-' . $datePart . '-' . $randomPart;
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}
