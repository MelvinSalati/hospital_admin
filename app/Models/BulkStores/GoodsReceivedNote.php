<?php

namespace App\Models\BulkStores;

use Illuminate\Database\Eloquent\Model;
use App\Models\Supplier;
use App\Models\BulkStores\GrnApproval;
use App\Models\BulkStores\PurchaseRequisition;
use Illuminate\Support\Str;

class GoodsReceivedNote extends Model
{
    protected $table = 'goods_received_notes';

    protected $fillable = [
        'grn_number',
        'grn_uuid',
        'purchase_order_id',
        'supplier_id',
        'received_date',
        'delivery_note_number',
        'invoice_number',
        'received_by',
        'inspected_by',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'notes',
        'quality_notes',
        'storage_location',
        'attachments',
    ];

    protected $casts = [
        'attachments' => 'array',
        'approved_at' => 'datetime',
        'received_date' => 'date',
    ];

    protected static function booted()
    {
        static::creating(function ($goodsReceivedNote) {
            if (!$goodsReceivedNote->grn_uuid) {
                $goodsReceivedNote->grn_uuid = (string) Str::uuid();
            }
        });
    }

    public function grnItem(){
        return $this->hasMany(\App\Models\BulkStores\GoodsReceivedItem::class,'grn_id');
    } 

    public function requisition(){
        return $this->belongsTo(\App\Models\BulkStores\PurchaseRequisitionItem::class,'purchase_order_id');
    }

    public function receivedBy()
    {
        return $this->belongsTo(\App\Models\User::class, 'received_by');
    }
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseRequistion::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function approvals()
    {
        return $this->hasMany(GrnApproval::class);
    }
}
