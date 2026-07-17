<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DepartmentStock extends Model
{
    protected $table = 'department_stocks';

    protected $fillable = [
        'product_id',
        'department_id',
        'stock_balance',
        'balance_after',
        'adjustment',
        'transaction_type',
        'transaction_uuid',
        'reference_number',
        'reorder_level',
        'min_stock',
        'max_stock',
        'location',
        'shelf_number',
        'is_active',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'stock_balance' => 'integer',
        'reorder_level' => 'integer',
        'min_stock' => 'integer',
        'max_stock' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get the product for this stock.
     */
    public function product()
    {
        return $this->belongsTo(DrugItem::class, 'product_id');
    }

    /**
     * Get the department for this stock.
     */
    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    /**
     * Check if stock is low (below reorder level).
     */
    public function isLowStock(): bool
    {
        return $this->stock_balance <= $this->reorder_level;
    }

    /**
     * Check if stock is critical (below minimum).
     */
    public function isCriticalStock(): bool
    {
        return $this->stock_balance <= $this->min_stock;
    }

    /**
     * Check if stock is out of stock.
     */
    public function isOutOfStock(): bool
    {
        return $this->stock_balance <= 0;
    }

    /**
     * Get stock status label.
     */
    public function getStockStatusAttribute(): string
    {
        if ($this->isOutOfStock()) {
            return 'Out of Stock';
        }
        if ($this->isCriticalStock()) {
            return 'Critical Stock';
        }
        if ($this->isLowStock()) {
            return 'Low Stock';
        }
        return 'Adequate';
    }

    /**
     * Get stock status color.
     */
    public function getStockStatusColorAttribute(): string
    {
        return match ($this->getStockStatusAttribute()) {
            'Out of Stock' => 'red',
            'Critical Stock' => 'red',
            'Low Stock' => 'yellow',
            'Adequate' => 'green',
            default => 'gray',
        };
    }

    /**
     * Get the quantity needed to reach reorder level.
     */
    public function getQuantityToReorderAttribute(): int
    {
        if ($this->stock_balance >= $this->reorder_level) {
            return 0;
        }
        return $this->reorder_level - $this->stock_balance;
    }

    /**
     * Scope a query to only include low stock items.
     */
    public function scopeLowStock($query)
    {
        return $query->whereRaw('stock_balance <= reorder_level');
    }

    /**
     * Scope a query to only include critical stock items.
     */
    public function scopeCriticalStock($query)
    {
        return $query->whereRaw('stock_balance <= min_stock');
    }

    /**
     * Scope a query to only include out of stock items.
     */
    public function scopeOutOfStock($query)
    {
        return $query->where('stock_balance', '<=', 0);
    }

    /**
     * Scope a query to only include items with adequate stock.
     */
    public function scopeInStock($query)
    {
        return $query->where('stock_balance', '>', 0)
            ->whereRaw('stock_balance > reorder_level');
    }

    /**
     * Scope a query to only include active stocks.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', 1);
    }

    /**
     * Scope a query by department.
     */
    public function scopeByDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    /**
     * Scope a query by product.
     */
    public function scopeByProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }
}
