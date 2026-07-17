<?php

namespace App\Models\Laboratory;

use App\Models\User;
use App\Models\Patients\Patient;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TestOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'test_orders';

    protected $fillable = [
        'order_number',
        'patient_id',
        'test_config_id',
        'priority',
        'sample_type',
        'sample_condition',
        'status',
        'collected_by',
        'collected_at',
        'performed_by',
        'performed_at',
        'verified_by',
        'verified_at',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'collected_at' => 'datetime',
        'performed_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function testConfig()
    {
        return $this->belongsTo(TestConfig::class, 'test_config_id');
    }

    public function results()
    {
        return $this->hasMany(TestResult::class, 'test_order_id');
    }

    public function collectedBy()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function getStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'Pending',
            'collected' => 'Collected',
            'in_progress' => 'In Progress',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            'rejected' => 'Rejected',
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function getPriorityLabelAttribute()
    {
        $labels = [
            'routine' => 'Routine',
            'urgent' => 'Urgent',
            'emergency' => 'Emergency',
        ];
        return $labels[$this->priority] ?? $this->priority;
    }

    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    public function isPending()
    {
        return $this->status === 'pending';
    }
}
