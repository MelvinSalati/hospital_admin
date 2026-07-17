<?php

namespace App\Models\BulkStores;

use App\Models\BulkStores\BulkStoreItem;
use App\Models\BulkStores\StockMovement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class BulkStore extends Model
{
    protected $fillable = [
        'store_uuid',
        'name',
        'code',
        'location',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // -------------------------------------------------------------------------
    // Boot – auto-generate UUID on creation
    // -------------------------------------------------------------------------

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->store_uuid)) {
                $model->store_uuid = (string) Str::uuid();
            }
        });
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * All inventory line-items held in this store.
     */
    public function items(): HasMany
    {
        return $this->hasMany(BulkStoreItem::class);
    }

    /**
     * Every stock movement that references this store
     * (receipts from suppliers, issues to departments, transfers, adjustments).
     */
    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * Only inbound movements (receiving from a supplier).
     */
    public function receivings(): HasMany
    {
        return $this->hasMany(StockMovement::class)
            ->where('type', 'receiving');
    }

    /**
     * Only outbound movements (issuing to a department).
     */
    public function issuings(): HasMany
    {
        return $this->hasMany(StockMovement::class)
            ->where('type', 'issuing');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Limit query to active stores only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Current on-hand quantity for a specific product across all batches.
     */
    public function stockQuantityFor(int $productId): int
    {
        return $this->items()
            ->where('product_id', $productId)
            ->sum('quantity');
    }

    /**
     * Check whether the store can fulfil a requested quantity for a product.
     */
    public function canFulfil(int $productId, int $requestedQty): bool
    {
        return $this->stockQuantityFor($productId) >= $requestedQty;
    }
}
