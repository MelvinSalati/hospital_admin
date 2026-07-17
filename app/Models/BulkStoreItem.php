<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class BulkStoreItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'item_uuid',
        'bulk_store_id',
        'product_id',
        'quantity',
        'reorder_level',
        'expiry_date',
        'batch_number',
        'unit_cost',
    ];

    protected $casts = [
        'quantity'      => 'integer',
        'reorder_level' => 'integer',
        'expiry_date'   => 'date',
        'unit_cost'     => 'decimal:2',
    ];

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->item_uuid)) {
                $model->item_uuid = (string) Str::uuid();
            }
        });
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function bulkStore(): BelongsTo
    {
        return $this->belongsTo(BulkStore::class);
    }

    public function product(): BelongsTo
    {
        // Adjust namespace if your Product model lives elsewhere
        return $this->belongsTo(\App\Models\Product::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Items expiring within the given number of days.
     */
    public function scopeExpiringWithin($query, int $days = 30)
    {
        return $query->whereNotNull('expiry_date')
                     ->whereDate('expiry_date', '<=', now()->addDays($days))
                     ->whereDate('expiry_date', '>=', now());
    }

    /**
     * Items that have already expired.
     */
    public function scopeExpired($query)
    {
        return $query->whereNotNull('expiry_date')
                     ->whereDate('expiry_date', '<', now());
    }

    /**
     * Items at or below their reorder threshold.
     */
    public function scopeLowStock($query)
    {
        return $query->whereColumn('quantity', '<=', 'reorder_level')
                     ->where('reorder_level', '>', 0);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    public function isExpired(): bool
    {
        return $this->expiry_date && $this->expiry_date->isPast();
    }

    public function isLowStock(): bool
    {
        return $this->reorder_level > 0 && $this->quantity <= $this->reorder_level;
    }

    public function daysUntilExpiry(): ?int
    {
        return $this->expiry_date ? (int) now()->diffInDays($this->expiry_date, false) : null;
    }
}
