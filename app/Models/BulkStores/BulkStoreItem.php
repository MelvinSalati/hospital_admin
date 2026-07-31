<?php
// app/Models/BulkStores/BulkStoreItem.php

namespace App\Models\BulkStores;

use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\BulkStores\StockMovement;
use App\Models\BulkStores\GoodsReceivedNote;



class BulkStoreItem extends Model
{
    protected $table = 'bulk_store_items';

    protected $fillable = [
        'item_uuid',
        'store_id',
        'product_id',        // Links to products table
        'batch_number',
        'quantity',
        'unit_cost',
        'selling_price',
        'expiry_date',
        'manufacturer',
        'supplier_id',
        'purchase_order_id',
        'grn_id',
        'storage_location',
        'quality_status',
        'status',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    // Status constants
    const STATUS_ACTIVE = 'active';
    const STATUS_DEPLETED = 'depleted';
    const STATUS_EXPIRED = 'expired';
    const STATUS_QUARANTINE = 'quarantine';
    const STATUS_RECALLED = 'recalled';

    const QUALITY_PENDING = 'pending';
    const QUALITY_APPROVED = 'approved';
    const QUALITY_REJECTED = 'rejected';
    const QUALITY_QUARANTINE = 'quarantine';

    // Boot
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->item_uuid)) {
                $model->item_uuid = (string) Str::uuid();
            }
        });

        // After saving, update product total quantity
        static::saved(function (self $model) {
            if ($model->product_id) {
                $model->product?->updateTotalQuantity();
            }
        });

        // After deleting, update product total quantity
        static::deleted(function (self $model) {
            if ($model->product_id) {
                $model->product?->updateTotalQuantity();
            }
        });
    }

    // Relationships
    public function store()
    {
        return $this->belongsTo(BulkStore::class, 'store_id');
    }

    // CRITICAL: Links to products table
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function goodsReceivedNote()
    {
        return $this->belongsTo(GoodsReceivedNote::class, 'grn_id');
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class, 'bulk_store_item_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeExpiringSoon($query, $days = 30)
    {
        return $query->where('expiry_date', '<=', now()->addDays($days))
            ->where('expiry_date', '>', now());
    }

    public function scopeExpired($query)
    {
        return $query->where('expiry_date', '<', now());
    }

    public function scopeLowStock($query, $threshold = 10)
    {
        return $query->where('quantity', '<=', $threshold)
            ->where('quantity', '>', 0);
    }

    public function scopeByBatch($query, $batchNumber)
    {
        return $query->where('batch_number', $batchNumber);
    }

    public function scopeByProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    public function scopeApproved($query)
    {
        return $query->where('quality_status', self::QUALITY_APPROVED);
    }

    // Accessors
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_ACTIVE => 'Active',
            self::STATUS_DEPLETED => 'Depleted',
            self::STATUS_EXPIRED => 'Expired',
            self::STATUS_QUARANTINE => 'Quarantine',
            self::STATUS_RECALLED => 'Recalled',
            default => ucfirst($this->status),
        };
    }

    public function getQualityStatusLabelAttribute(): string
    {
        return match ($this->quality_status) {
            self::QUALITY_PENDING => 'Pending',
            self::QUALITY_APPROVED => 'Approved',
            self::QUALITY_REJECTED => 'Rejected',
            self::QUALITY_QUARANTINE => 'Quarantine',
            default => ucfirst($this->quality_status),
        };
    }

    public function getDaysToExpiryAttribute(): ?int
    {
        if (!$this->expiry_date) return null;
        return now()->diffInDays($this->expiry_date, false);
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expiry_date && $this->expiry_date < now();
    }

    public function getTotalValueAttribute(): float
    {
        return $this->quantity * $this->unit_cost;
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_ACTIVE => 'success',
            self::STATUS_DEPLETED => 'secondary',
            self::STATUS_EXPIRED => 'danger',
            self::STATUS_QUARANTINE => 'warning',
            self::STATUS_RECALLED => 'danger',
            default => 'secondary',
        };
    }

    public function getProductNameAttribute()
    {
        return $this->product?->product_name ?? 'Unknown Product';
    }

    public function getProductFullNameAttribute()
    {
        return $this->product?->full_name ?? 'Unknown Product';
    }

    // Helper Methods
    public function reduceStock(float $quantity, string $reason = null): void
    {
        if ($quantity > $this->quantity) {
            throw new \Exception("Insufficient stock. Available: {$this->quantity}, Requested: {$quantity}");
        }

        $this->quantity -= $quantity;

        if ($this->quantity <= 0) {
            $this->status = self::STATUS_DEPLETED;
        }

        $this->save();

        // Log movement
        $this->logMovement('issuing', $quantity, $reason);
    }

    public function increaseStock(float $quantity, string $reason = null): void
    {
        $this->quantity += $quantity;

        if ($this->status === self::STATUS_DEPLETED && $this->quantity > 0) {
            $this->status = self::STATUS_ACTIVE;
        }

        $this->save();

        // Log movement
        $this->logMovement('receiving', $quantity, $reason);
    }

    private function logMovement(string $type, float $quantity, ?string $reason = null): void
    {
        StockMovement::create([
            'movement_uuid' => (string) Str::uuid(),
            'store_id' => $this->store_id,
            'product_id' => $this->product_id,
            'bulk_store_item_id' => $this->id,
            'batch_number' => $this->batch_number,
            'type' => $type,
            'quantity' => $quantity,
            'unit_cost' => $this->unit_cost,
            'total_cost' => $quantity * $this->unit_cost,
            'reference_type' => 'bulk_store_item',
            'reference_id' => $this->id,
            'reason' => $reason,
            'notes' => "{$type} from bulk store item #{$this->id}",
            'performed_by' => auth()->id(),
        ]);
    }
}
