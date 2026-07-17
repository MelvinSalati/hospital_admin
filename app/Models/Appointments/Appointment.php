<?php

namespace App\Models\Appointments;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Appointment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'appointments';

    /**
     * Mass assignable fields
     */
    protected $fillable = [
        'appointment_uuid',
        'patient_id',
        'doctor_id',
        'created_by',
        'appointment_date',
        'appointment_time',
        'scheduled_at',
        'status',
        'priority',
        'visit_token',
        'reason',
        'notes',
        'department',
        'room',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [
        'appointment_date' => 'date',
        'appointment_time' => 'datetime:H:i',
        'scheduled_at'     => 'datetime',
        'deleted_at'       => 'datetime',
    ];

    /**
     * Boot method for auto-generating UUID
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($appointment) {
            if (empty($appointment->appointment_uuid)) {
                $appointment->appointment_uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * =========================
     * Relationships
     * =========================
     */

    public function patient()
    {
        return $this->belongsTo(\App\Models\Patients\Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(\App\Models\User::class, 'doctor_id');
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    /**
     * =========================
     * Query Scopes
     * =========================
     */

    public function scopeToday($query)
    {
        return $query->whereDate('appointment_date', now()->toDateString());
    }

    public function scopeUpcoming($query)
    {
        return $query->whereDate('appointment_date', '>=', now()->toDateString());
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeForDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }

    /**
     * =========================
     * Accessors
     * =========================
     */

    public function getIsTodayAttribute()
    {
        return $this->appointment_date?->isToday();
    }

    public function getIsPastAttribute()
    {
        return $this->appointment_date?->isPast();
    }

    public function getIsUpcomingAttribute()
    {
        return $this->appointment_date?->isFuture();
    }
}
