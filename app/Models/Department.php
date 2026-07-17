<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Department extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'department_uuid',
        'name',
        'code',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->department_uuid)) {
                $model->department_uuid = (string) Str::uuid();
            }
        });
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Stock movements where this department is the destination (receiving stock).
     */
    public function incomingMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'to_department_id');
    }

    /**
     * Stock movements where this department is the source (returning / transferring stock).
     */
    public function outgoingMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'from_department_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Total quantity of a product issued to this department across all time.
     */
    public function totalReceived(int $productId): int
    {
        return $this->incomingMovements()
                    ->where('product_id', $productId)
                    ->sum('quantity');
    }
}
