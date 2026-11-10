<?php
// app/Models/Laboratories/LabResultMiscellaneousItem.php

namespace App\Models\Laboratories;

use App\Models\Patients\LabOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabResultMiscellaneousItem extends Model
{
    protected $table = 'lab_result_miscellaneous_items';

    protected $fillable = [
        'lab_result_id',
        'lab_order_id',
        'laboratory_id',
        'test_name',
        'value',
        'value_numeric',
        'unit',
        'flag',
        'ref_low',
        'ref_high',
        'raw_line',
        'reason',
        'promoted_at',
        'promoted_by',
        'promoted_to_item_id',
    ];

    protected $casts = [
        'value_numeric' => 'decimal:6',
        'ref_low'       => 'decimal:6',
        'ref_high'      => 'decimal:6',
        'promoted_at'   => 'datetime',
    ];

    // Relationships
    public function labResult(): BelongsTo
    {
        return $this->belongsTo(LabResultFile::class, 'lab_result_id');
    }

    public function labOrder(): BelongsTo
    {
        return $this->belongsTo(LabOrder::class, 'lab_order_id');
    }

    public function laboratory(): BelongsTo
    {
        return $this->belongsTo(Laboratory::class, 'laboratory_id');
    }

    public function promotedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'promoted_by');
    }

    public function promotedToItem(): BelongsTo
    {
        return $this->belongsTo(LabResultItem::class, 'promoted_to_item_id');
    }
}
