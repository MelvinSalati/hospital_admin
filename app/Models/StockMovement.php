<?php

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use App\Models\Departments\Department; 

class StockMovement extends Model
{
    protected $fillable = [
        'movement_uuid',
        'product_id',
        'bulk_store_id',
        'from_department_id',
        'to_department_id',
        'supplier_id',
        'created_by',
        'type',
        'quantity',
        'reference_number',
        'batch_number',
        'expiry_date',
        'unit_cost',
        'remarks',
        'moved_at',
    ];

    protected $casts = [
        'quantity'    => 'integer',
        'expiry_date' => 'date',
        'unit_cost'   => 'decimal:2',
        'moved_at'    => 'datetime',
    ];

    // Stock movements are the permanent audit log – never soft-delete.

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->movement_uuid)) {
                $model->movement_uuid = (string) Str::uuid();
            }
            if (empty($model->moved_at)) {
                $model->moved_at = now();
            }
            // Auto-stamp the authenticated user
            if (empty($model->created_by) && auth()->check()) {
                $model->created_by = auth()->id();
            }
        });
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class);
    }

    public function bulkStore(): BelongsTo
    {
        return $this->belongsTo(BulkStore::class);
    }

    public function fromDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'from_department_id');
    }

    public function toDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'to_department_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeForProduct($query, int $productId)
    {
        return $query->where('product_id', $productId);
    }

    public function scopeForStore($query, int $storeId)
    {
        return $query->where('bulk_store_id', $storeId);
    }

    public function scopeBetween($query, string $from, string $to)
    {
        return $query->whereBetween('moved_at', [$from, $to]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Whether this movement increases stock (receiving / return).
     */
    public function isInbound(): bool
    {
        return in_array($this->type, ['receiving', 'return']);
    }

    /**
     * Whether this movement decreases stock (issuing).
     */
    public function isOutbound(): bool
    {
        return $this->type === 'issuing';
    }


    // Add a method to calculate balance after
    protected static function booted()
    {
        static::creating(function ($movement) {
            if ($movement->balance_after === null) {
                $currentStock = StockMovement::where('product_id', $movement->product_id)->sum('quantity');
                $movement->balance_after = $currentStock + $movement->quantity;
            }
        });
    }

    public static function physicalCount(array $data): self
    {
        return self::recordMovement(array_merge($data, [
            'type' => 'adjustment',
            'remarks' => ($data['remarks'] ?? '') . ' | Physical count adjustment',
        ]));
    }

    public function drug(): BelongsTo
    {
        return $this->belongsTo(DrugItem::class, 'product_id');
    }

    
}
