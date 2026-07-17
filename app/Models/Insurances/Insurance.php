<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Uuids;
use App\Models\Insurances\Policy;
use App\Models\Insurances\Provider;
use App\Models\Patients\Patient;


class Insurance extends Model
{
    protected $table="insurance_providers";

    protected $fillable = [
        'patient_id',
        'provider_id',
        'policy_id',
        'period_start',
        'period_end'
    ];

    protected $casts = [
        'insurance_uuid' => 'uuid',
        'period_start' => 'date',
        'period_end' => 'date'
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function provider()
    {
        return $this->belongsTo(Provider::class, 'provider_id');
    }

    public function policy()
    {
        return $this->belongsTo(Policy::class, 'policy_id');
    }
}
