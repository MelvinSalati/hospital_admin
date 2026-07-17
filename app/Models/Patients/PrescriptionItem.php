<?php

namespace App\Models\Patients;

use App\Models\User;
use App\Models\Patients\Patient;
use App\Models\Patients\Prescription;
use App\Models\Finance\Invoice;
use App\Models\Drugs\Drug;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PrescriptionItem extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'prescription_items';

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
        'prescription_id',
        'prescription_uuid',
        'drug_id',
        'visit_token',
        'patient_id',
        'drug_name',
        'drug_code',
        'drug_category',
        'dosage',
        'dosage_unit',
        'frequency',
        'frequency_label',
        'route',
        'duration',
        'duration_unit',
        'instructions',
        'quantity_prescribed',
        'quantity_dispensed',
        'quantity_remaining',
        'unit_price',
        'total_price',
        'currency',
        'payment_status',
        'payment_amount',
        'payment_date',
        'payment_method',
        'transaction_reference',
        'invoice_id',
        'invoice_item_id',
        'dispensation_status',
        'dispensed_by',
        'dispensed_at',
        'reason_not_dispensed',
        'is_active',
        'is_cancelled',
        'cancelled_by',
        'cancelled_at',
        'cancellation_reason',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity_prescribed' => 'decimal:2',
        'quantity_dispensed' => 'decimal:2',
        'quantity_remaining' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'payment_amount' => 'decimal:2',
        'duration' => 'integer',
        'is_active' => 'boolean',
        'is_cancelled' => 'boolean',
        'payment_date' => 'datetime',
        'dispensed_at' => 'datetime',
        'cancelled_at' => 'datetime',
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
     * Get the prescription that owns this item.
     */
    public function prescription()
    {
        return $this->belongsTo(Prescription::class, 'prescription_id', 'id');
    }

    /**
     * Get the drug/service associated with this item.
     */
    public function drug()
    {
        return $this->belongsTo(Drug::class, 'drug_id', 'id');
    }

    /**
     * Get the patient associated with this item.
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'id');
    }

    /**
     * Get the invoice associated with this item.
     */
    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id', 'id');
    }

    /**
     * Get the user who dispensed this item.
     */
    public function dispenser()
    {
        return $this->belongsTo(User::class, 'dispensed_by', 'id');
    }

    /**
     * Get the user who cancelled this item.
     */
    public function cancelledBy()
    {
        return $this->belongsTo(User::class, 'cancelled_by', 'id');
    }

    /**
     * Scope a query to only include paid items.
     */
    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    /**
     * Scope a query to only include unpaid items.
     */
    public function scopeUnpaid($query)
    {
        return $query->where('payment_status', 'pending');
    }

    /**
     * Scope a query to only include items ready for dispensation.
     */
    public function scopeReadyForDispense($query)
    {
        return $query->where('payment_status', 'paid')
            ->whereIn('dispensation_status', ['pending', 'partial'])
            ->where('quantity_remaining', '>', 0)
            ->where('is_active', true)
            ->where('is_cancelled', false);
    }

    /**
     * Scope a query to only include items that can be dispensed.
     */
    public function scopeCanDispense($query)
    {
        return $query->readyForDispense();
    }

    /**
     * Scope a query to only include active items.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('is_cancelled', false);
    }

    /**
     * Scope a query to filter by prescription.
     */
    public function scopeForPrescription($query, $prescriptionId)
    {
        return $query->where('prescription_id', $prescriptionId);
    }

    /**
     * Scope a query to filter by patient.
     */
    public function scopeForPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    /**
     * Get the dispensation status badge color.
     */
    public function getDispensationStatusBadgeAttribute(): string
    {
        return match ($this->dispensation_status) {
            'pending' => 'bg-yellow-100 text-yellow-800',
            'partial' => 'bg-blue-100 text-blue-800',
            'completed' => 'bg-green-100 text-green-800',
            'cancelled' => 'bg-red-100 text-red-800',
            'not_dispensed' => 'bg-gray-100 text-gray-800',
            default => 'bg-gray-100 text-gray-600',
        };
    }

    /**
     * Get the payment status badge color.
     */
    public function getPaymentStatusBadgeAttribute(): string
    {
        return match ($this->payment_status) {
            'pending' => 'bg-red-100 text-red-800',
            'paid' => 'bg-green-100 text-green-800',
            'partial' => 'bg-yellow-100 text-yellow-800',
            'failed' => 'bg-red-100 text-red-800',
            'refunded' => 'bg-gray-100 text-gray-800',
            default => 'bg-gray-100 text-gray-600',
        };
    }

    /**
     * Check if the item can be dispensed.
     */
    public function canBeDispensed(): bool
    {
        return $this->payment_status === 'paid'
            && in_array($this->dispensation_status, ['pending', 'partial'])
            && $this->quantity_remaining > 0
            && $this->is_active
            && !$this->is_cancelled;
    }

    /**
     * Check if the item is fully dispensed.
     */
    public function isFullyDispensed(): bool
    {
        return $this->dispensation_status === 'completed' || $this->quantity_remaining <= 0;
    }

    /**
     * Check if the item is partially dispensed.
     */
    public function isPartiallyDispensed(): bool
    {
        return $this->dispensation_status === 'partial' && $this->quantity_remaining > 0;
    }

    /**
     * Check if payment is completed.
     */
    public function isPaid(): bool
    {
        return $this->payment_status === 'paid';
    }

    /**
     * Get the remaining quantity to dispense.
     */
    public function getRemainingQuantity(): float
    {
        return (float) $this->quantity_remaining;
    }

    /**
     * Get the dispensed quantity.
     */
    public function getDispensedQuantity(): float
    {
        return (float) $this->quantity_dispensed;
    }

    /**
     * Get the prescribed quantity.
     */
    public function getPrescribedQuantity(): float
    {
        return (float) $this->quantity_prescribed;
    }

    /**
     * Calculate the dispensation percentage.
     */
    public function getDispensationPercentageAttribute(): float
    {
        if ($this->quantity_prescribed <= 0) {
            return 0;
        }
        return round(($this->quantity_dispensed / $this->quantity_prescribed) * 100, 2);
    }

    /**
     * Get the total amount due for this item.
     */
    public function getAmountDueAttribute(): float
    {
        return (float) $this->total_price - (float) $this->payment_amount;
    }

    /**
     * Update dispensation status based on quantities.
     */
    public function updateDispensationStatus(): void
    {
        if ($this->quantity_dispensed >= $this->quantity_prescribed) {
            $this->dispensation_status = 'completed';
        } elseif ($this->quantity_dispensed > 0 && $this->quantity_dispensed < $this->quantity_prescribed) {
            $this->dispensation_status = 'partial';
        } elseif ($this->quantity_dispensed == 0) {
            $this->dispensation_status = 'pending';
        }

        $this->quantity_remaining = $this->quantity_prescribed - $this->quantity_dispensed;
        $this->save();
    }

    /**
     * Mark item as dispensed.
     */
    public function markAsDispensed($quantity, $userId = null): void
    {
        $this->quantity_dispensed += $quantity;
        $this->quantity_remaining = $this->quantity_prescribed - $this->quantity_dispensed;

        if ($this->quantity_dispensed >= $this->quantity_prescribed) {
            $this->dispensation_status = 'completed';
        } else {
            $this->dispensation_status = 'partial';
        }

        $this->dispensed_by = $userId ?? auth()->id();
        $this->dispensed_at = now();
        $this->save();
    }

    /**
     * Mark item as paid.
     */
    public function markAsPaid($paymentMethod = null, $transactionRef = null): void
    {
        $this->payment_status = 'paid';
        $this->payment_amount = $this->total_price;
        $this->payment_date = now();
        $this->payment_method = $paymentMethod;
        $this->transaction_reference = $transactionRef;
        $this->save();
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->prescription_uuid)) {
                $model->prescription_uuid = (string) \Str::uuid();
            }
            if (empty($model->quantity_remaining)) {
                $model->quantity_remaining = $model->quantity_prescribed;
            }
            if (empty($model->total_price) && $model->quantity_prescribed && $model->unit_price) {
                $model->total_price = $model->quantity_prescribed * $model->unit_price;
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('quantity_dispensed')) {
                $model->quantity_remaining = $model->quantity_prescribed - $model->quantity_dispensed;

                if ($model->quantity_dispensed >= $model->quantity_prescribed) {
                    $model->dispensation_status = 'completed';
                } elseif ($model->quantity_dispensed > 0 && $model->quantity_dispensed < $model->quantity_prescribed) {
                    $model->dispensation_status = 'partial';
                } elseif ($model->quantity_dispensed == 0) {
                    $model->dispensation_status = 'pending';
                }
            }
        });
    }
}
