<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseRequisitionItem extends Model
{
    protected $fillable = [
        'requisition_id',
        'product_id',
        'quantity',
        'estimated_unit_price',
        'estimated_total',
        'required_by_date',
        'notes'
    ];
}
