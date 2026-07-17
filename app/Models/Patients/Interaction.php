<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Interaction extends Model
{
    protected $fillable = [
        'interaction_uuid',
        'patient_id',
        'provider_id',
        'type',
        'description',
        'status',
        'reference_number',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($interaction) {
            if (empty($interaction->interaction_uuid)) {
                $interaction->interaction_uuid = (string) Str::uuid();
            }
        });
    }

    // Relationships - fixed missing return statements
    public function patient()
    {
        return $this->belongsTo(\App\Models\Patients\Patient::class, 'patient_id');
    }

    public function provider()
    {
        return $this->belongsTo(\App\Models\User::class, 'provider_id');
    }

    // Scope to get latest interactions (most recent first)
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    // Scope to get recent interactions with optional limit
    public function scopeRecent($query, $limit = 10)
    {
        return $query->latest()->limit($limit);
    }

    // Scope to get interactions for a specific patient ordered by most recent
    public function scopeForPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId)->latest();
    }

    // Helper method to check if interaction is recent (within last X days)
    public function isRecent($days = 7)
    {
        return $this->created_at->greaterThanOrEqualTo(now()->subDays($days));
    }

    // Accessor to get formatted created date
    public function getFormattedCreatedAtAttribute()
    {
        return $this->created_at->format('M d, Y h:i A');
    }

    // Default ordering for all queries
    protected static function booted()
    {
        static::addGlobalScope('latest', function ($query) {
            $query->latest();
        });
    }
}
