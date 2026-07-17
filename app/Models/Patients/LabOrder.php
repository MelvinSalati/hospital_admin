<?php

namespace App\Models\Patients;

use App\Models\User;
use App\Models\Admission;
use App\Models\Payments\Invoice;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabOrder extends Model
{
    use SoftDeletes;

    protected $table = 'lab_orders';

    protected $fillable = [
        'order_number',
        'visit_token',
        'patient_id',
        'admission_id',
        'admission_number',
        'scheme',
        'clinical_notes',
        'status',
        'priority',
        'ordered_by',
        'ordered_date',
        'collected_date',
        'collected_by',
        'processing_date',
        'completed_date',
        'cancelled_date',
        'cancelled_reason',
        'total_amount',
        'invoice_id',
        'is_admitted'
    ];

    protected $casts = [
        'ordered_date' => 'datetime',
        'collected_date' => 'datetime',
        'processing_date' => 'datetime',
        'completed_date' => 'datetime',
        'cancelled_date' => 'datetime',
        'total_amount' => 'decimal:2',
        'is_admitted' => 'boolean'
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function admission()
    {
        return $this->belongsTo(Admission::class, 'admission_id');
    }

    public function items()
    {
        return $this->hasMany(LabOrderItem::class, 'lab_order_id');
    }

    public function orderedBy()
    {
        return $this->belongsTo(User::class, 'ordered_by');
    }

    public function collectedBy()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
