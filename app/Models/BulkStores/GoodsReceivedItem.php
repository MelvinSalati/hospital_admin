<?php

namespace App\Models\BulkStores;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GoodsReceivedItem extends Model
{
use SoftDeletes;

protected $table = 'goods_received_items';

protected $fillable = [
'grn_id',
'purchase_order_item_id',
'product_id',
'quantity_received',
'quantity_accepted',
'quantity_rejected',
'batch_number',
'expiry_date',
'manufacturer',
'rejection_reason',
'quality_status',
'notes',
'created_at',
'updated_at',
];

protected $casts = [
'expiry_date' => 'date',
'quantity_received' => 'decimal:2',
'quantity_accepted' => 'decimal:2',
'quantity_rejected' => 'decimal:2',
'created_at' => 'datetime',
'updated_at' => 'datetime',
];

// Status constants for quality_status
const QUALITY_PENDING = 'pending';
const QUALITY_APPROVED = 'approved';
const QUALITY_REJECTED = 'rejected';
const QUALITY_PARTIAL = 'partial';

// Relationships
public function grn()
{
return $this->belongsTo(GoodsReceivedNote::class, 'grn_id');
}
    // In GoodsReceivedItem model
    public function purchaseRequisitionItem()
    {
        return $this->belongsTo(PurchaseRequisitionItem::class, 'purchase_requisition_item_id');
    }
   
public function product()
{
return $this->belongsTo(Product::class);
}

public function purchaseOrderItem()
{
return $this->belongsTo(PurchaseOrderItem::class, 'purchase_order_item_id');
}

// Scopes
public function scopeApproved($query)
{
return $query->where('quality_status', self::QUALITY_APPROVED);
}

public function scopeRejected($query)
{
return $query->where('quality_status', self::QUALITY_REJECTED);
}

public function scopePending($query)
{
return $query->where('quality_status', self::QUALITY_PENDING);
}

// Helper methods
public function isApproved()
{
return $this->quality_status === self::QUALITY_APPROVED;
}

public function isRejected()
{
return $this->quality_status === self::QUALITY_REJECTED;
}

public function isPending()
{
return $this->quality_status === self::QUALITY_PENDING;
}


public function getAcceptedQuantity()
{
return $this->quantity_accepted ?? $this->quantity_received;
}

public function getRejectedQuantity()
{
return $this->quantity_rejected ?? 0;
}
}



