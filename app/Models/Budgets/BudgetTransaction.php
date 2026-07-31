<?php

namespace App\Models\Budgets;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetTransaction extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'budget_transactions';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'transaction_no',
        'budget_code',
        'transaction_type',
        'reference_type',
        'reference_id',
        'amount',
        'balance_before',
        'balance_after',
        'description',
        'transaction_date',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'transaction_date' => 'datetime',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the budget allocation associated with this transaction.
     */
    public function budgetAllocation(): BelongsTo
    {
        return $this->belongsTo(BudgetAllocation::class, 'budget_code', 'budget_code');
    }

    /**
     * Get the user who created this transaction.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who approved this transaction.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scope a query to get transactions by budget code.
     */
    public function scopeByBudgetCode($query, string $budgetCode)
    {
        return $query->where('budget_code', $budgetCode);
    }

    /**
     * Scope a query to get transactions by type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('transaction_type', $type);
    }

    /**
     * Scope a query to get transactions by reference.
     */
    public function scopeByReference($query, string $type, int $id)
    {
        return $query->where('reference_type', $type)
            ->where('reference_id', $id);
    }

    /**
     * Scope a query to get transactions by date range.
     */
    public function scopeDateBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('transaction_date', [$startDate, $endDate]);
    }

    /**
     * Get the transaction type label.
     */
    public function getTransactionTypeLabelAttribute(): string
    {
        $types = [
            'reservation' => 'Reservation',
            'commitment' => 'Commitment',
            'actual' => 'Actual Spend',
            'reversal' => 'Reversal',
        ];

        return $types[$this->transaction_type] ?? ucfirst($this->transaction_type);
    }

    /**
     * Get the reference type label.
     */
    public function getReferenceTypeLabelAttribute(): string
    {
        $types = [
            'PR' => 'Purchase Requisition',
            'PO' => 'Purchase Order',
            'GRN' => 'Goods Received Note',
            'INV' => 'Invoice',
        ];

        return $types[$this->reference_type] ?? $this->reference_type;
    }

    /**
     * Get the formatted amount.
     */
    public function getFormattedAmountAttribute(): string
    {
        return 'ZK ' . number_format($this->amount, 2);
    }

    /**
     * Get the formatted balance before.
     */
    public function getFormattedBalanceBeforeAttribute(): string
    {
        return 'ZK ' . number_format($this->balance_before, 2);
    }

    /**
     * Get the formatted balance after.
     */
    public function getFormattedBalanceAfterAttribute(): string
    {
        return 'ZK ' . number_format($this->balance_after, 2);
    }

    /**
     * Check if the transaction is a credit (positive amount).
     */
    public function isCredit(): bool
    {
        return $this->amount > 0;
    }

    /**
     * Check if the transaction is a debit (negative amount).
     */
    public function isDebit(): bool
    {
        return $this->amount < 0;
    }

    /**
     * Get the transaction status (approved or pending).
     */
    public function getStatusAttribute(): string
    {
        return $this->approved_at ? 'approved' : 'pending';
    }

    /**
     * Get the transaction status label.
     */
    public function getStatusLabelAttribute(): string
    {
        return $this->approved_at ? 'Approved' : 'Pending';
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate transaction number if not provided
        static::creating(function ($model) {
            if (empty($model->transaction_no)) {
                $model->transaction_no = self::generateTransactionNumber();
            }
        });
    }

    /**
     * Generate a unique transaction number.
     */
    public static function generateTransactionNumber(): string
    {
        $prefix = 'BT';
        $date = now()->format('Ymd');
        $lastTransaction = self::where('transaction_no', 'like', "{$prefix}-{$date}-%")
            ->orderBy('id', 'desc')
            ->first();

        if ($lastTransaction) {
            $lastNumber = intval(substr($lastTransaction->transaction_no, -5));
            $sequence = str_pad($lastNumber + 1, 5, '0', STR_PAD_LEFT);
        } else {
            $sequence = '00001';
        }

        return "{$prefix}-{$date}-{$sequence}";
    }

    /**
     * Create a reservation transaction.
     */
    public static function createReservation(
        string $budgetCode,
        string $referenceType,
        int $referenceId,
        float $amount,
        float $balanceBefore,
        float $balanceAfter,
        string $description,
        int $createdBy
    ): self {
        return self::create([
            'transaction_no' => self::generateTransactionNumber(),
            'budget_code' => $budgetCode,
            'transaction_type' => 'reservation',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'description' => $description,
            'transaction_date' => now(),
            'created_by' => $createdBy,
        ]);
    }

    /**
     * Create a commitment transaction.
     */
    public static function createCommitment(
        string $budgetCode,
        string $referenceType,
        int $referenceId,
        float $amount,
        float $balanceBefore,
        float $balanceAfter,
        string $description,
        int $createdBy,
        int $approvedBy
    ): self {
        return self::create([
            'transaction_no' => self::generateTransactionNumber(),
            'budget_code' => $budgetCode,
            'transaction_type' => 'commitment',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'description' => $description,
            'transaction_date' => now(),
            'created_by' => $createdBy,
            'approved_by' => $approvedBy,
            'approved_at' => now(),
        ]);
    }

    /**
     * Create an actual spend transaction.
     */
    public static function createActual(
        string $budgetCode,
        string $referenceType,
        int $referenceId,
        float $amount,
        float $balanceBefore,
        float $balanceAfter,
        string $description,
        int $createdBy,
        int $approvedBy
    ): self {
        return self::create([
            'transaction_no' => self::generateTransactionNumber(),
            'budget_code' => $budgetCode,
            'transaction_type' => 'actual',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'description' => $description,
            'transaction_date' => now(),
            'created_by' => $createdBy,
            'approved_by' => $approvedBy,
            'approved_at' => now(),
        ]);
    }

    /**
     * Create a reversal transaction.
     */
    public static function createReversal(
        string $budgetCode,
        string $referenceType,
        int $referenceId,
        float $amount,
        float $balanceBefore,
        float $balanceAfter,
        string $description,
        int $createdBy
    ): self {
        return self::create([
            'transaction_no' => self::generateTransactionNumber(),
            'budget_code' => $budgetCode,
            'transaction_type' => 'reversal',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'description' => $description,
            'transaction_date' => now(),
            'created_by' => $createdBy,
        ]);
    }
}
