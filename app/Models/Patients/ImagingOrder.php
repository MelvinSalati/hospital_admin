<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Models\Payments\Invoice;

class ImagingOrder extends Model
{
    use SoftDeletes;

    protected $table = 'imaging_orders';

    protected $fillable = [
        'visit_token',
        'order_number',
        'patient_id',
        'admission_id',
        'admission_number',
        'invoice_id',
        'modality',
        'body_part',
        'priority',
        'clinical_indication',
        'clinical_history',
        'contrast_required',
        'status',
        'scheme',
        'total_amount',
        'ordered_by',
        'ordered_date',
        'scheduled_date',
        'scheduled_by',
        'performed_by',
        'performed_date',
        'reported_by',
        'reported_date',
        'cancelled_by',
        'cancelled_date',
        'cancelled_reason',
        'findings',
        'impression',
        'recommendations',
        'report_content',
        'report_file_path',
        'notes',
        'is_admitted'
    ];

    protected $casts = [
        'contrast_required' => 'boolean',
        'is_admitted' => 'boolean',
        'ordered_date' => 'datetime',
        'scheduled_date' => 'datetime',
        'performed_date' => 'datetime',
        'reported_date' => 'datetime',
        'cancelled_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'total_amount' => 'decimal:2'
    ];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function admission()
    {
        return $this->belongsTo(Admission::class, 'admission_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function orderedBy()
    {
        return $this->belongsTo(User::class, 'ordered_by');
    }

    public function scheduledBy()
    {
        return $this->belongsTo(User::class, 'scheduled_by');
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function reportedBy()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function cancelledBy()
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function items()
    {
        return $this->hasMany(ImagingOrderItem::class, 'imaging_order_id');
    }

    // Helper method to generate order number
    public static function generateOrderNumber()
    {
        $prefix = 'IMG';
        $date = now()->format('Ymd');
        $lastOrder = self::whereDate('created_at', today())
            ->orderBy('id', 'desc')
            ->first();

        if ($lastOrder) {
            preg_match('/(\d+)$/', $lastOrder->order_number, $matches);
            $lastNumber = isset($matches[1]) ? intval($matches[1]) : 0;
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "{$prefix}-{$date}-{$newNumber}";
    }
}

// ImagingOrderItem Model
class ImagingOrderItem extends Model
{
    protected $table = 'imaging_order_items';

    protected $fillable = [
        'imaging_order_id',
        'body_part',
        'modality',
        'findings',
        'impression',
        'status',
        'performed_by',
        'performed_date'
    ];

    protected $casts = [
        'performed_date' => 'datetime'
    ];

    public function imagingOrder()
    {
        return $this->belongsTo(ImagingOrder::class, 'imaging_order_id');
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
