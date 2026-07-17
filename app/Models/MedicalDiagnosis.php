<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalDiagnosis extends Model
{
    protected $fillable = [
        'diagnosis',
        'dx_uuid',
    ];
}
