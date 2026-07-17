<?php

namespace App\Models\Laboratory;

use App\Models\User;
use App\Models\Patients\Patient;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TestResult extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'test_results';

    protected $fillable = [
        'test_order_id',
        'test_config_id',
        'patient_id',
        'parameter_id',
        'value',
        'remarks',
        'entered_by',
        'entered_at',
        'verified_by',
        'verified_at',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'entered_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function testOrder()
    {
        return $this->belongsTo(TestOrder::class, 'test_order_id');
    }

    public function testConfig()
    {
        return $this->belongsTo(TestConfig::class, 'test_config_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function parameter()
    {
        return $this->belongsTo(TestParameter::class, 'parameter_id');
    }

    public function enteredBy()
    {
        return $this->belongsTo(User::class, 'entered_by');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeVerified($query)
    {
        return $query->where('status', 'verified');
    }

    public function getStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'Pending',
            'entered' => 'Entered',
            'verified' => 'Verified',
            'rejected' => 'Rejected',
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function isVerified()
    {
        return $this->status === 'verified';
    }

    public function isPending()
    {
        return $this->status === 'pending';
    }

    public function getFormattedValueAttribute()
    {
        if ($this->value && $this->parameter && $this->parameter->unit) {
            return $this->value . ' ' . $this->parameter->unit;
        }
        return $this->value;
    }
}
