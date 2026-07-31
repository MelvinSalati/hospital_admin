<?php

namespace App\Models\BulkStores;

use Illuminate\Database\Eloquent\Model;
use App\Models\Bulkstores\Product;

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


    public function product(){
        return $this->belongsTo(Product::class,'product_id');
    } 

    public function  requisition(){
        return $this->belongsTo(PurchaseRequisition::class,'requisition_id');
    }
}
