<?php

namespace App\Models\Nurses;

use Illuminate\Database\Eloquent\Model;
use App\Models\Patients\Patient;
use App\Models\User;

class Admission extends Model
{
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    } 

    public function admittedBy(){
        return $this->belongsTo(User::class, 'admitted_by');
    }

    public function dischargedBy(){
        return $this->belongsTo(User::class, 'discharged_by');
    }
}
