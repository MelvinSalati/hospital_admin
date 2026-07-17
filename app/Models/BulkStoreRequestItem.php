<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BulkStoreRequestItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bulk_store_request_items';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'request_id',
        'product_id',
        'quantity_requested',
        'quantity_approved',
        'quantity_dispatched',
        'quantity_received',
        'quantity_returned',
        'unit_price',
        'total_price',
        'batch_number',
        'expiry_date',
        'status',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity_requested' => 'integer',
        'quantity_approved' => 'integer',
        'quantity_dispatched' => 'integer',
        'quantity_received' => 'integer',
        'quantity_returned' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'expiry_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the request that owns this item.
     */
    public function request(): BelongsTo
    {
        return $this->belongsTo(BulkStoreRequest::class, 'request_id');
    }

    /**
     * Get the product for this item.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(DrugItem::class, 'product_id');
    }

    /**
     * Get the status label.
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pending',
            'approved' => 'Approved',
            'partial' => 'Partially Received',
            'dispatched' => 'Dispatched',
            'received' => 'Received',
            'cancelled' => 'Cancelled',
            default => ucfirst($this->status),
        };
    }

    /**
     * Get the status color.
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'warning',
            'approved' => 'info',
            'partial' => 'secondary',
            'dispatched' => 'primary',
            'received' => 'success',
            'cancelled' => 'danger',
            default => 'gray',
        };
    }

    /**
     * Get the remaining quantity to receive.
     */
    public function getRemainingQuantityAttribute(): int
    {
        return max(0, ($this->quantity_approved ?? 0) - ($this->quantity_received ?? 0));
    }

    /**
     * Check if item is fully received.
     */
    public function isFullyReceived(): bool
    {
        return ($this->quantity_received ?? 0) >= ($this->quantity_approved ?? 0);
    }

    /**
     * Check if item can be received.
     */
    public function canReceive(): bool
    {
        return in_array($this->status, ['approved', 'partial', 'dispatched'])
            && $this->quantity_received < $this->quantity_approved;
    }

    /**
     * Calculate total price.
     */
    public function calculateTotalPrice(): float
    {
        return $this->quantity_requested * $this->unit_price;
    }

    /**
     * Scope a query to only include pending items.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include approved items.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope a query to only include received items.
     */
    public function scopeReceived($query)
    {
        return $query->where('status', 'received');
    }

    /**
     * Scope a query to only include cancelled items.
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }
}
