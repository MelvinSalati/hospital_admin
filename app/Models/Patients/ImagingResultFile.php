<?php

namespace App\Models\Patients;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ImagingResultFile extends Model
{
    use SoftDeletes;

    protected $table = 'imaging_result_files';

    protected $fillable = [
        'imaging_order_id',
        'imaging_order_item_id',
        'visit_token',
        'patient_id',
        'file_name',
        'file_path',
        'file_type',
        'mime_type',
        'file_size',
        'uploaded_by',
        'notes',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    protected static function booted(): void
    {
        // When a file is created (uploaded)
        static::created(function (ImagingResultFile $file) {
            $order = $file->imagingOrder;

            // Only update if the order is still pending/in-progress
            if ($order && in_array($order->status, ['pending', 'scheduled', 'in_progress'])) {
                $order->update([
                    'status'        => 'performed', // or 'reported' if the report is also submitted
                    'performed_date' => $order->performed_date ?? now(),
                ]);
            }
        });

        // Optional: if a file is deleted, revert status back to pending (if no files remain)
        static::deleted(function (ImagingResultFile $file) {
            $order = $file->imagingOrder;

            if ($order && $order->imagingResultFiles()->where('is_removed', 0)->count() === 0) {
                $order->update([
                    'status'         => 'pending',
                    'performed_date' => null,
                ]);
            }
        });
    }

    public function order()
    {
        return $this->belongsTo(ImagingOrder::class, 'imaging_order_id');
    }

    public function item()
    {
        return $this->belongsTo(ImagingOrderItem::class, 'imaging_order_item_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
    /**
     * Get the imaging order that owns this result file.
     */
    public function imagingOrder(): BelongsTo
    {
        return $this->belongsTo(ImagingOrder::class, 'imaging_order_id');
    }
}
