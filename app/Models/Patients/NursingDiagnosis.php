<?php

namespace App\Models\Patients;

use App\Models\User;
use App\Models\Patients\Patient;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class NursingDiagnosis extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'nursing_diagnoses';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'patient_id',
        'nursing_diagnosis_uuid',
        'admission_number',
        'problem',
        'etiology',
        'symptoms',
        'intervention',  // ADDED THIS - WAS MISSING!
        'evaluation',
        'date_identified',
        'status',
        'is_smart',
        'created_by',
        'updated_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'date_identified' => 'date',
        'is_smart' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'deleted_at',
    ];

    /**
     * Boot function to generate UUID on creating.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->nursing_diagnosis_uuid)) {
                $model->nursing_diagnosis_uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the patient that owns the nursing diagnosis.
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'id');
    }

    /**
     * Get the user who created the nursing diagnosis.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    /**
     * Get the user who last updated the nursing diagnosis.
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by', 'id');
    }

    /**
     * Scope a query to only include active diagnoses.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query to only include in-progress diagnoses.
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in-progress');
    }

    /**
     * Scope a query to only include resolved diagnoses.
     */
    public function scopeResolved($query)
    {
        return $query->where('status', 'resolved');
    }

    /**
     * Scope a query to only include SMART diagnoses.
     */
    public function scopeSmart($query)
    {
        return $query->where('is_smart', true);
    }

    /**
     * Scope a query to filter by patient.
     */
    public function scopeForPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    /**
     * Scope a query to filter by admission number.
     */
    public function scopeForAdmission($query, $admissionNumber)
    {
        return $query->where('admission_number', $admissionNumber);
    }

    /**
     * Get the status badge color.
     */
    public function getStatusBadgeAttribute(): string
    {
        return match ($this->status) {
            'active' => 'bg-yellow-100 text-yellow-800',
            'in-progress' => 'bg-blue-100 text-blue-800',
            'resolved' => 'bg-green-100 text-green-800',
            'inactive' => 'bg-gray-100 text-gray-800',
            'waiting...' => 'bg-gray-100 text-gray-800',
            default => 'bg-gray-100 text-gray-800',
        };
    }

    /**
     * Get the status label.
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => 'Active',
            'in-progress' => 'In Progress',
            'resolved' => 'Resolved',
            'inactive' => 'Inactive',
            'waiting...' => 'Waiting',
            default => ucfirst($this->status),
        };
    }

    /**
     * Check if diagnosis is SMART.
     */
    public function getIsSmartLabelAttribute(): string
    {
        return $this->is_smart ? 'Yes' : 'No';
    }

    /**
     * Get formatted date identified.
     */
    public function getFormattedDateIdentifiedAttribute(): string
    {
        return $this->date_identified->format('M d, Y');
    }

    /**
     * Get full diagnosis statement (Problem + Etiology + Symptoms).
     */
    public function getFullStatementAttribute(): string
    {
        $statement = $this->problem;

        if ($this->etiology) {
            $statement .= " related to {$this->etiology}";
        }

        if ($this->symptoms && $this->symptoms !== 'none') {
            $statement .= " as evidenced by {$this->symptoms}";
        }

        return $statement;
    }
}
