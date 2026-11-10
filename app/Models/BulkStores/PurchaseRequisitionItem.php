<?php

namespace App\Models\BulkStores;

use Illuminate\Database\Eloquent\Model;
use App\Models\Bulkstores\Product;
use App\Models\Services\Service;

class PurchaseRequisitionItem extends Model
{
    protected $fillable = [
        'requisition_id',
        'product_id',
        'quantity',
        'estimated_unit_price',
        'required_by_date',
        'notes'
    ];


    // app/Models/PurchaseRequisitionItem.php
    public function product()
    {
        // products come from `services` table in your case
        return $this->belongsTo(Service::class, 'product_id');
    }
    public function service()
    {
        // products come from `services` table in your case
        return $this->belongsTo(Service::class, 'product_id');
    }


    public function  requisition()
    {
        return $this->belongsTo(PurchaseRequisition::class, 'requisition_id');
    }
}
