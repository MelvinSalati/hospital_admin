<?php

namespace App\Models\Laboratories;

use App\Models\Patients\LabOrder;
use App\Models\Patients\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LabResultFile extends Model
{
    protected $fillable = [
        'lab_order_id',
        'patient_id',
        'uploaded_by',
        'original_name',
        'path',
        'mime_type',
        'size',
        'report_no',
        'ocr_text',
        'processing_status',
        'processing_error',
        'processing_started_at',
        'processing_completed_at',
        'ocr_engine',
    ];

    protected $casts = [
        'processing_started_at'   => 'datetime',
        'processing_completed_at' => 'datetime',
        'size'                    => 'integer',
    ];

    // ─── Relationships ────────────────────────────────────────────────

    public function labOrder(): BelongsTo
    {
        return $this->belongsTo(LabOrder::class, 'lab_order_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function resultItems(): HasMany
    {
        return $this->hasMany(LabResultItem::class, 'lab_result_id');
    }


    public function miscellaneousItems(): HasMany
    {
        return $this->hasMany(LabResultMiscellaneousItem::class, 'lab_result_id');
    }
}
