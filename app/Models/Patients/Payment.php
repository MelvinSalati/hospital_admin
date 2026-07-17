<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;
use App\Models\Patients\Invoice;

class Payment extends Model
{
    protected $table = 'payments';

    protected $fillable = [
        'patient_id',
        'invoice_id',
        'payment_number',
        'payment_method',
        'total_amount',
        'paid_amount',
        'change_amount',
        'payment_date',
        'status',
        'tendered_amount',
        'mobile_money_number',
        'agent_code',
        'transaction_reference',
        'payment_confirmed',
        'notes',
        'receipt_number'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'tendered_amount' => 'decimal:2',
        'payment_confirmed' => 'boolean',
        'payment_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the patient that made the payment
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    /**
     * Get the invoice associated with the payment
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    /**
     * Get the payment items for this payment
     */
    public function items(): HasMany
    {
        return $this->hasMany(PaymentItem::class, 'payment_id');
    }

    /**
     * Generate unique payment number
     */
    public static function generatePaymentNumber(): string
    {
        $prefix = 'PAY-' . date('Ymd');
        $lastPayment = self::where('payment_number', 'LIKE', $prefix . '%')
            ->orderBy('id', 'desc')
            ->first();

        if ($lastPayment) {
            $lastNumber = intval(substr($lastPayment->payment_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . '-' . $newNumber;
    }

    /**
     * Scope for completed payments
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for pending payments
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for payments by date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('payment_date', [$startDate, $endDate]);
    }

    /**
     * Scope for cash payments
     */
    public function scopeCash($query)
    {
        return $query->where('payment_method', 'cash');
    }

    /**
     * Scope for mobile money payments
     */
    public function scopeMobileMoney($query)
    {
        return $query->where('payment_method', 'mobile_money');
    }
}
