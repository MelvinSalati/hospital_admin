<?php

namespace App\Models\BulkStores;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepartmentRequisition extends Model
{
    use HasFactory;

    protected $table = 'department_requisitions';

    protected $fillable = [
        'requisition_uuid',
        'requisition_number',
        'department_id',
        'requested_by',
        'requested_at',
        'required_by_date',
        'delivery_location',
        'delivery_notes',
        'status',
        'priority',
        'justification',
        'remarks',
        'budget_code',
        'cost_center',
        'account_code',
        'estimated_total',
        'approval_required',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'fulfilled_by',
        'fulfilled_at',
        'cancelled_by',
        'cancelled_at',
        'created_by',
        'updated_by',
        'metadata',
    ];

    protected $casts = [
        'requested_at'       => 'datetime',
        'required_by_date'   => 'date',
        'approved_at'        => 'datetime',
        'rejected_at'        => 'datetime',
        'fulfilled_at'       => 'datetime',
        'cancelled_at'       => 'datetime',
        'estimated_total'    => 'decimal:2',
        'approval_required'  => 'boolean',
        'metadata'           => 'array',
    ];

    // ─── Relationships ─────────────────────────────────

    public function items(): HasMany
    {
        // NOTE: the FK on items is misleadingly named "department_id"
        return $this->hasMany(DepartmentRequisitionItem::class, 'department_requisition_id', 'id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Department::class, 'department_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'requested_by');
    } 
}
