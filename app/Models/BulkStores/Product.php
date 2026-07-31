<?php
// app/Models/Product.php

namespace App\Models\BulkStores;

use App\Models\BulkStores\BulkStoreItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\BulkStores\PurchaseOrderItem;
use App\Models\BulkStores\PrescriptionItem;
use App\Models\BulkStores\DispensedItem;


class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'product_uuid',
        'product_name',
        'product_code',
        'description',
        'category_id',
        'strength',
        'unit',
        'form',
        'quantity',
        'expiry_date',
        'transaction_type',
        'from_deparment_id',
        'to_department_id',
        'supplier_id',
        'created_by',
        'created_by_department',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'expiry_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Boot method to generate UUID
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->product_uuid)) {
                $model->product_uuid = (string) Str::uuid();
            }
        });
    }

    // ============================================
    // RELATIONSHIPS
    // ============================================

    /**
     * Category relationship
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Supplier relationship
     */
    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Created by user
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Department relationships
     */
    public function fromDepartment()
    {
        return $this->belongsTo(Department::class, 'from_deparment_id');
    }

    public function toDepartment()
    {
        return $this->belongsTo(Department::class, 'to_department_id');
    }

    /**
     * BULK STORE RELATIONSHIPS
     * Links to bulk store items (stock batches)
     */
    public function bulkStoreItems()
    {
        return $this->hasMany(BulkStoreItem::class, 'product_id');
    }

    /**
     * Get active bulk store items only
     */
    public function activeBulkStoreItems()
    {
        return $this->bulkStoreItems()
            ->where('status', 'active')
            ->where('quality_status', 'approved');
    }

    /**
     * Purchase order items
     */
    public function purchaseOrderItems()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    /**
     * Prescription items
     */
    public function prescriptionItems()
    {
        return $this->hasMany(PrescriptionItem::class);
    }

    /**
     * Dispensed items
     */
    public function dispensedItems()
    {
        return $this->hasMany(DispensedItem::class);
    }

    // ============================================
    // SCOPES
    // ============================================

    /**
     * Active products
     */
    public function scopeActive($query)
    {
        return $query->whereNotNull('product_name');
    }

    /**
     * Search products
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('product_name', 'LIKE', "%{$search}%")
                ->orWhere('product_code', 'LIKE', "%{$search}%")
                ->orWhere('description', 'LIKE', "%{$search}%");
        });
    }

    /**
     * Products with low stock
     */
    public function scopeLowStock($query, $threshold = 10)
    {
        return $query->where('quantity', '<=', $threshold)
            ->where('quantity', '>', 0);
    }

    /**
     * Out of stock products
     */
    public function scopeOutOfStock($query)
    {
        return $query->where('quantity', '<=', 0);
    }

    /**
     * Products by category
     */
    public function scopeByCategory($query, $categoryId)
    {
        return $query->where('category_id', $categoryId);
    }

    /**
     * Products by form
     */
    public function scopeByForm($query, $form)
    {
        return $query->where('form', $form);
    }

    // ============================================
    // ACCESSORS & MUTATORS
    // ============================================

    /**
     * Get full product name with strength
     */
    public function getFullNameAttribute(): string
    {
        $name = $this->product_name ?? '';
        if ($this->strength) {
            $name .= ' ' . $this->strength;
        }
        if ($this->form) {
            $name .= ' (' . $this->form . ')';
        }
        return $name;
    }

    /**
     * Get stock status
     */
    public function getStockStatusAttribute(): string
    {
        $quantity = (float) $this->quantity;
        if ($quantity <= 0) return 'out_of_stock';
        if ($quantity <= 10) return 'low_stock';
        if ($quantity <= 50) return 'medium_stock';
        return 'in_stock';
    }

    /**
     * Get stock status color
     */
    public function getStockStatusColorAttribute(): string
    {
        return match ($this->stock_status) {
            'out_of_stock' => 'danger',
            'low_stock' => 'warning',
            'medium_stock' => 'info',
            'in_stock' => 'success',
            default => 'secondary',
        };
    }

    /**
     * Get stock status badge HTML
     */
    public function getStockStatusBadgeAttribute(): string
    {
        $colors = [
            'out_of_stock' => 'danger',
            'low_stock' => 'warning',
            'medium_stock' => 'info',
            'in_stock' => 'success',
        ];
        $color = $colors[$this->stock_status] ?? 'secondary';
        return "<span class='badge bg-{$color}'>{$this->stock_status}</span>";
    }

    /**
     * Get form label
     */
    public function getFormLabelAttribute(): string
    {
        $forms = [
            'tablet' => 'Tablet',
            'capsule' => 'Capsule',
            'cream' => 'Cream',
            'powder' => 'Powder',
            'suspension' => 'Suspension',
            'injection' => 'Injection',
            'inhaler' => 'Inhaler',
            'syrup' => 'Syrup',
            'ointment' => 'Ointment',
        ];
        return $forms[$this->form] ?? $this->form;
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Get total stock value across all stores
     */
    public function getTotalStockValue(): float
    {
        return $this->bulkStoreItems()
            ->where('status', 'active')
            ->where('quality_status', 'approved')
            ->get()
            ->sum(function ($item) {
                return $item->quantity * $item->unit_cost;
            });
    }

    /**
     * Get number of active batches
     */
    public function getBatchCount(): int
    {
        return $this->bulkStoreItems()
            ->where('status', 'active')
            ->where('quality_status', 'approved')
            ->count();
    }

    /**
     * Get batches expiring soon
     */
    public function getExpiringBatches($days = 30)
    {
        return $this->bulkStoreItems()
            ->where('status', 'active')
            ->where('quality_status', 'approved')
            ->where('expiry_date', '<=', now()->addDays($days))
            ->where('expiry_date', '>', now())
            ->orderBy('expiry_date', 'asc')
            ->get();
    }

    /**
     * Get expired batches
     */
    public function getExpiredBatches()
    {
        return $this->bulkStoreItems()
            ->where('status', 'active')
            ->where('quality_status', 'approved')
            ->where('expiry_date', '<', now())
            ->get();
    }

    /**
     * Get quantity in a specific store
     */
    public function getStoreQuantity($storeId): float
    {
        return $this->bulkStoreItems()
            ->where('store_id', $storeId)
            ->where('status', 'active')
            ->where('quality_status', 'approved')
            ->sum('quantity');
    }

    /**
     * Get all stock details by store
     */
    public function getStockDetails()
    {
        return $this->bulkStoreItems()
            ->with(['store'])
            ->where('status', 'active')
            ->where('quality_status', 'approved')
            ->get()
            ->groupBy('store_id')
            ->map(function ($items, $storeId) {
                $store = $items->first()->store;
                return [
                    'store_id' => $storeId,
                    'store_name' => $store->name ?? 'Unknown',
                    'store_code' => $store->code ?? 'N/A',
                    'total_quantity' => $items->sum('quantity'),
                    'total_value' => $items->sum(function ($item) {
                        return $item->quantity * $item->unit_cost;
                    }),
                    'batches' => $items->map(function ($item) {
                        return [
                            'batch_number' => $item->batch_number,
                            'quantity' => $item->quantity,
                            'unit_cost' => $item->unit_cost,
                            'selling_price' => $item->selling_price,
                            'expiry_date' => $item->expiry_date->format('Y-m-d'),
                            'days_to_expiry' => $item->days_to_expiry,
                            'storage_location' => $item->storage_location,
                        ];
                    }),
                ];
            });
    }

    /**
     * Get best batch by FIFO (earliest expiry)
     */
    public function getBestBatch($storeId = null)
    {
        $query = $this->bulkStoreItems()
            ->where('status', 'active')
            ->where('quality_status', 'approved')
            ->where('quantity', '>', 0)
            ->where('expiry_date', '>', now())
            ->orderBy('expiry_date', 'asc');

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        return $query->first();
    }

    /**
     * Update total quantity from bulk store items
     */
    public function updateTotalQuantity(): float
    {
        $total = $this->bulkStoreItems()
            ->where('status', 'active')
            ->where('quality_status', 'approved')
            ->sum('quantity');

        $this->quantity = $total;
        $this->save();

        return $total;
    }

    /**
     * Check if product can dispense a quantity
     */
    public function canDispense($quantity = 1): bool
    {
        return (float) $this->quantity >= $quantity;
    }

    /**
     * Get products with stock alerts
     */
    public static function getStockAlerts()
    {
        $products = self::with(['category'])->get();

        return [
            'out_of_stock' => $products->filter(function ($p) {
                return $p->stock_status === 'out_of_stock';
            })->values(),
            'low_stock' => $products->filter(function ($p) {
                return $p->stock_status === 'low_stock';
            })->values(),
            'expiring_soon' => $products->filter(function ($p) {
                return $p->getExpiringBatches(30)->count() > 0;
            })->values(),
        ];
    }

    /**
     * Get product summary for dashboard
     */
    public static function getDashboardSummary()
    {
        $total = self::count();
        $active = self::active()->count();
        $lowStock = self::lowStock()->count();
        $outOfStock = self::outOfStock()->count();

        return [
            'total_products' => $total,
            'active_products' => $active,
            'low_stock_products' => $lowStock,
            'out_of_stock_products' => $outOfStock,
            'healthy_stock' => $active - $lowStock - $outOfStock,
        ];
    }
}
