<?php

namespace App\Models\Patients;

use App\Models\User;
use App\Models\Services\Service;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabOrderItem extends Model
{
    use SoftDeletes;

    protected $table = 'lab_order_items';

    protected $fillable = [
        'visit_token',
        'lab_order_id',
        'test_id',
        'test_name',
        'test_category',
        'quantity',
        'unit_price',
        'total_price',
        'priority',
        'notes',
        'collection_date',
        'status',
        'result_value',
        'reference_range',
        'unit',
        'interpretation',
        'performed_by',
        'performed_date',
        'result_notes'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'collection_date' => 'datetime',
        'performed_date' => 'datetime'
    ];

    public function labOrder()
    {
        return $this->belongsTo(LabOrder::class, 'lab_order_id');
    }

    public function test()
    {
        return $this->belongsTo(Service::class, 'test_id');
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
