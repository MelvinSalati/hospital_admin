<?php

namespace App\Models\BulkStores;

use App\Models\User;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\PurchaseOrderItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class StockBatch extends Model
{
    use SoftDeletes;

    protected $table = 'stock_batches';

    protected $fillable = [
        'uuid',
        'product_id',
        'batch_number',
        'expiry_date',
        'quantity',
        'received_quantity',
        'remaining_quantity',
        'purchase_order_item_id',
        'supplier_id',
        'status',
        'location',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'quantity' => 'integer',
        'received_quantity' => 'integer',
        'remaining_quantity' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName()
    {
        return 'uuid';
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'batch_id');
    }
}
