<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Patients\Patient;
use App\Models\Pharmacy\Drug;
use Illuminate\Support\Facades\Log;

class DrugAdministration extends Model
{
    use SoftDeletes;

    protected $table = 'drug_administrations';

    protected $fillable = [
        'patient_id',
        'drug_id',
        'drug_name',
        'dose',
        'administered_at',
        'scheduled_time',
        'signed_by',
        'signature',
        'status',
        'notes',
        'prescription_uuid',
        'admission_number',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'administered_at' => 'datetime',
        'scheduled_time' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        // Remove deleted_at from casts temporarily
    ];

    protected $attributes = [
        'status' => 'swallowed'
    ];

    // Override the boot method to handle invalid dates
    protected static function boot()
    {
        parent::boot();

        // Modify the soft delete query to handle invalid dates
        static::addGlobalScope('validDeletedAt', function ($query) {
            $query->where(function ($q) {
                $q->whereNull('deleted_at')
                    ->orWhere('deleted_at', '0000-00-00 00:00:00')
                    ->orWhere('deleted_at', '0000-00-00');
            });
        });
    }

    // Override the default soft delete behavior
    public function getDeletedAtColumn()
    {
        return 'deleted_at';
    }

    // Custom method to check if model is trashed
    public function trashed()
    {
        $deletedAt = $this->deleted_at;
        return !is_null($deletedAt) &&
            $deletedAt !== '0000-00-00 00:00:00' &&
            $deletedAt !== '0000-00-00';
    }

    // Rest of your model code remains the same...
    const STATUS_SWALLOWED = 'swallowed';
    const STATUS_INJECTED = 'injected';
    const STATUS_VOMITTED = 'vomitted';
    const STATUS_DID_NOT_SWALLOW = 'did_not_swallow';
    const STATUS_REFUSED = 'refused';
    const STATUS_PARTIAL = 'partial';
    const STATUS_HELD = 'held';

    public static function getStatuses()
    {
        return [
            self::STATUS_SWALLOWED,
            self::STATUS_INJECTED,
            self::STATUS_VOMITTED,
            self::STATUS_DID_NOT_SWALLOW,
            self::STATUS_REFUSED,
            self::STATUS_PARTIAL,
            self::STATUS_HELD
        ];
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function drug()
    {
        return $this->belongsTo(Drug::class, 'drug_id');
    }

    public function scopeByAdmission($query, $admissionNumber)
    {
        return $query->where('admission_number', $admissionNumber);
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('administered_at', [$startDate, $endDate]);
    }

    public function scopeByPrescription($query, $prescriptionUuid)
    {
        return $query->where('prescription_uuid', $prescriptionUuid);
    }

    public function getStatusBadgeAttribute()
    {
        $badges = [
            self::STATUS_SWALLOWED => 'success',
            self::STATUS_INJECTED => 'info',
            self::STATUS_VOMITTED => 'warning',
            self::STATUS_DID_NOT_SWALLOW => 'danger',
            self::STATUS_REFUSED => 'dark',
            self::STATUS_PARTIAL => 'secondary',
            self::STATUS_HELD => 'danger'
        ];

        return $badges[$this->status] ?? 'secondary';
    }

    public function getFormattedAdministeredAtAttribute()
    {
        return $this->administered_at ? $this->administered_at->format('Y-m-d H:i:s') : null;
    }
}
