<?php

namespace App\Models\Budgets;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class BudgetTransaction extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'transaction_no',
        'transaction_code',
        'budget_code',
        'budget_allocation_id',
        'transaction_type',
        'reference_type',
        'reference_id',
        'amount',
        'balance_before',
        'balance_after',
        'description',
        'transaction_date',
        'item_name',
        'quantity',
        'unit_cost',
        'payee_name',
        'payment_method',
        'reference_number',
        'receipt_path',
        'receipt_original_name',
        'receipt_mime',
        'receipt_size',
        'status',
        'rejection_reason',
        'created_by',
        'recorded_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'amount'           => 'decimal:2',
        'balance_before'   => 'decimal:2',
        'balance_after'    => 'decimal:2',
        'quantity'         => 'decimal:2',
        'unit_cost'        => 'decimal:2',
        'transaction_date' => 'date',
        'approved_at'      => 'datetime',
        'receipt_size'     => 'integer',
    ];

    public function allocation(): BelongsTo
    {
        return $this->belongsTo(BudgetAllocation::class, 'budget_allocation_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
