<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Models\Departments\Department;
use App\Helpers\VisitTokenHelper;

class VisitToken extends Model
{
    use SoftDeletes;

    protected $table = 'visit_tokens';

    protected $fillable = [
        'token',
        'patient_id',
        'patient_number',
        'payment_method',
        'original_payment_method',
        'status',
        'created_by',
        'assigned_department_id',
        'assigned_staff_id',
        'started_at',
        'completed_at',
        'expires_at',
        'metadata'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignedDepartment()
    {
        return $this->belongsTo(Department::class, 'assigned_department_id');
    }

    public function assignedStaff()
    {
        return $this->belongsTo(User::class, 'assigned_staff_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    // Helper Methods
    public static function generateToken($patientId, $patientNumber, $paymentMethod, $createdBy, $originalMethod = null)
    {
        // Generate unique token
        $token = self::generateUniqueToken();

        // Set expiration (24 hours from now)
        $expiresAt = now()->addHours(24);

        return self::create([
            'token' => $token,
            'patient_id' => $patientId,
            'patient_number' => $patientNumber,
            'payment_method' => $paymentMethod === 'card' ? 'cash' : $paymentMethod,
            'original_payment_method' => $originalMethod ?? $paymentMethod,
            'status' => 'active',
            'created_by' => $createdBy,
            'started_at' => now(),
            'expires_at' => $expiresAt,
            'metadata' => [
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]
        ]);
    }

    private static function generateUniqueToken()
    {
        do {
            $date = now()->format('Ymd');
            $random = strtoupper(substr(uniqid(), -6));
            $token = "{$date}-{$random}";
        } while (self::where('token', $token)->exists());

        return $token;
    }

    public function complete()
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now()
        ]);

        // Clear from cache
        VisitTokenHelper::clearFromCache($this->patient_id);
    }

    public function cancel()
    {
        $this->update([
            'status' => 'cancelled'
        ]);

        // Clear from cache
        VisitTokenHelper::clearFromCache($this->patient_id);
    }

    public function isExpired()
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function assignToDepartment($departmentId)
    {
        $this->update(['assigned_department_id' => $departmentId]);
        return $this;
    }

    public function assignToStaff($staffId)
    {
        $this->update(['assigned_staff_id' => $staffId]);
        return $this;
    }
}
