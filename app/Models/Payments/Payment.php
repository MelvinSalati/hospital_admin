<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class Payment extends Model
{
    protected $table = 'payment_items';

    protected $fillable = [
        'visit_token',
        'patient_id',
        'invoice_id',
        'payment_id',
        'item_type',
        'item_source_id',
        'item_name',
        'item_description',
        'quantity',
        'unit_price',
        'total_price',
        'discount_amount',
        'tax_amount',
        'paid_amount',
        'status',
        'paid_at'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the patient associated with the payment item
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    /**
     * Get the invoice associated with the payment item
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    /**
     * Get the payment associated with this item
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    /**
     * Scope for paid items
     */
    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    /**
     * Scope by item type
     */
    public function scopeOfType($query, $itemType)
    {
        return $query->where('item_type', $itemType);
    }
}
