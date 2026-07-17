<?php

namespace App\Models\Payments;

use App\Models\Patients\Patient;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PaymentMethod extends Model
{
    use SoftDeletes;

    protected $table = 'payment_methods';

    protected $fillable = [
        'payment_method_uuid',
        'patient_id',
        'name',
        'code',
        'type',
        'provider',
        'account_number',
        'account_name',
        'is_active',
        'requires_reference',
        'charge_percentage',
        'charge_fixed',
        'sort_order',
        'is_default'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'requires_reference' => 'boolean',
        'is_default' => 'boolean',
        'charge_percentage' => 'decimal:2',
        'charge_fixed' => 'decimal:2',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    // Payment method types
    const TYPE_CASH = 'cash';
    const TYPE_MOBILE_MONEY = 'mobile_money';
    const TYPE_CARD = 'card';
    const TYPE_BANK_TRANSFER = 'bank_transfer';
    const TYPE_INSURANCE = 'insurance';
    const TYPE_CHECK = 'check';
    const TYPE_ONLINE = 'online';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->payment_method_uuid)) {
                $model->payment_method_uuid = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function calculateCharge($amount)
    {
        $charge = 0;
        if ($this->charge_percentage) {
            $charge += ($amount * $this->charge_percentage / 100);
        }
        if ($this->charge_fixed) {
            $charge += $this->charge_fixed;
        }
        return $charge;
    }
}
