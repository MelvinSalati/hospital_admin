<?php

namespace App\Models\Finance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FinanceExpense extends Model
{
    use SoftDeletes;

    /** Statuses that count as real spending in totals and reports. */
    public const SPENT_STATUSES = ['approved', 'paid'];

    protected $fillable = [
        'expense_no',
        'expense_date',
        'category_id',
        'budget_code',
        'budget_transaction_id',
        'payee_name',
        'amount',
        'payment_method',
        'reference_number',
        'description',
        'receipt_path',
        'receipt_original_name',
        'status',
        'rejection_reason',
        'created_by',
        'approved_by',
        'approved_at',
        'paid_by',
        'paid_at',
    ];

    protected $casts = [
        'expense_date' => 'date',
        'amount'       => 'decimal:2',
        'approved_at'  => 'datetime',
        'paid_at'      => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $expense) {
            $expense->expense_no ??= 'EXP-' . now()->format('Ym') . '-' . Str::upper(Str::random(6));
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(FinanceCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    /** Shape sent to the React page. */
    public function toFrontend(): array
    {
        return [
            'id'                    => $this->id,
            'expense_no'            => $this->expense_no,
            'expense_date'          => $this->expense_date?->format('Y-m-d'),
            'category_id'           => $this->category_id,
            'category_name'         => $this->category?->name,
            'budget_code'           => $this->budget_code,
            'budget_transaction_id' => $this->budget_transaction_id,
            'payee_name'            => $this->payee_name,
            'amount'                => number_format((float) $this->amount, 2, '.', ''),
            'payment_method'        => $this->payment_method,
            'reference_number'      => $this->reference_number,
            'description'           => $this->description,
            'receipt_path'          => $this->receipt_path,
            'receipt_original_name' => $this->receipt_original_name,
            'status'                => $this->status,
            'rejection_reason'      => $this->rejection_reason,
            'created_by'            => $this->created_by,
            'creator_name'          => $this->creator?->name,
            'approved_by'           => $this->approved_by,
            'approver_name'         => $this->approver?->name,
            'approved_at'           => $this->approved_at?->toIso8601String(),
            'paid_by'               => $this->paid_by,
            'payer_name'            => $this->payer?->name,
            'paid_at'               => $this->paid_at?->toIso8601String(),
            'created_at'            => $this->created_at?->toIso8601String(),
            'updated_at'            => $this->updated_at?->toIso8601String(),
        ];
    }
}
