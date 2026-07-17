<?php

namespace App\Models\BulkStores;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    protected $fillable = [
        'purchase_order_id',
        'product_id',
        'ordered_quantity',
        'received_quantity',
        'unit_price',
        'batch_number',
        'expiry_date',
    ];

    protected $casts = [
        'ordered_quantity'  => 'integer',
        'received_quantity' => 'integer',
        'unit_price'        => 'decimal:2',
        'expiry_date'       => 'date',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    public function pendingQuantity(): int
    {
        return max(0, $this->ordered_quantity - $this->received_quantity);
    }

    public function isFullyReceived(): bool
    {
        return $this->received_quantity >= $this->ordered_quantity;
    }

    public function lineTotal(): float
    {
        return $this->ordered_quantity * $this->unit_price;
    }
}
