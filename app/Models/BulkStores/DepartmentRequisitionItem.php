<?php

namespace App\Models\BulkStores;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepartmentRequisitionItem extends Model
{
    use HasFactory;

    protected $table = 'department_requisition_items';

    protected $fillable = [
        'uuid',
        'department_id',           // ⚠️ FK to department_requisitions.id (badly named)
        'product_id',
        'quantity_requested',
        'quantity_approved',
        'quantity_issued',
        'unit',
        'estimated_unit_price',
        'department_requisition_id',
        'estimated_total',
        'actual_unit_price',
        'actual_total',
        'batch_number',
        'expiry_date',
        'notes',
    ];

    protected $casts = [
        'quantity_requested'    => 'integer',
        'quantity_approved'     => 'integer',
        'quantity_issued'       => 'integer',
        'estimated_unit_price'  => 'decimal:2',
        'estimated_total'       => 'decimal:2',
        'actual_unit_price'     => 'decimal:2',
        'actual_total'          => 'decimal:2',
        'expiry_date'           => 'date',
    ];

    public function requisition(): BelongsTo
    {
        // FK is "department_id" but it points to department_requisitions.id
        return $this->belongsTo(DepartmentRequisition::class, 'department_id', 'id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    } 

    
}
