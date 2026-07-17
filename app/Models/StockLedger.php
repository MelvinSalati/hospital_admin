<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockLedger extends Model
{
    use HasFactory;

    protected $table = 'drug_transactions'; // Map to your existing table

    protected $fillable = [
        'drug_id',
        'transaction_type',
        'quantity',
        'balance_after',
        'reference_number',
        'transaction_date',
        'created_by',
        'patient_id',
        'invoice_number',
        'source_department',
        'destination_department',
        'batch_id',
        'expiry_date',
        'notes',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
        'quantity' => 'integer',
        'balance_after' => 'integer',
        'expiry_date' => 'date',
    ];

    // =========================================================================
    // Relationships
    // =========================================================================

    /**
     * Get the drug associated with this stock movement
     */
    public function drug(): BelongsTo
    {
        return $this->belongsTo(DrugItem::class, 'drug_id');
    }

    /**
     * Get the user who created this transaction
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the patient associated with this transaction (for dispensations)
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /**
     * Get the batch associated with this transaction
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(DrugBatch::class, 'batch_id');
    }

    // =========================================================================
    // Scopes
    // =========================================================================

    /**
     * Scope for a specific drug
     */
    public function scopeForDrug($query, $drugId)
    {
        return $query->where('drug_id', $drugId);
    }

    /**
     * Scope for a specific transaction type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('transaction_type', $type);
    }

    /**
     * Scope for date range
     */
    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('transaction_date', [$from, $to]);
    }

    /**
     * Scope for today's transactions
     */
    public function scopeToday($query)
    {
        return $query->whereDate('transaction_date', today());
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    /**
     * Check if this is an addition to stock
     */
    public function isAddition(): bool
    {
        return $this->quantity > 0;
    }

    /**
     * Check if this is a deduction from stock
     */
    public function isDeduction(): bool
    {
        return $this->quantity < 0;
    }

    /**
     * Get the human-readable transaction type label
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->transaction_type) {
            'dispensed' => 'Dispensed',
            'stock_refill' => 'Stock Refill',
            'physical_count' => 'Physical Count',
            'issued' => 'Issued',
            'received' => 'Received',
            'adjustment' => 'Adjustment',
            'returned' => 'Returned',
            'expired' => 'Expired',
            'damaged' => 'Damaged',
            default => ucfirst(str_replace('_', ' ', $this->transaction_type)),
        };
    }

    /**
     * Get the icon for the transaction type
     */
    public function getTypeIconAttribute(): string
    {
        return match ($this->transaction_type) {
            'dispensed' => '💊',
            'stock_refill' => '📦',
            'physical_count' => '🔢',
            'issued' => '📤',
            'received' => '📥',
            'adjustment' => '⚖️',
            'returned' => '↩️',
            'expired' => '⛔',
            'damaged' => '💔',
            default => '📋',
        };
    }

    /**
     * Get the color class for the transaction type
     */
    public function getTypeColorAttribute(): string
    {
        return match ($this->transaction_type) {
            'dispensed' => 'blue',
            'stock_refill' => 'green',
            'physical_count' => 'purple',
            'issued' => 'orange',
            'received' => 'emerald',
            'adjustment' => 'amber',
            'returned' => 'indigo',
            'expired' => 'red',
            'damaged' => 'rose',
            default => 'gray',
        };
    }

    /**
     * Get the CSS class for quantity display
     */
    public function getQuantityClassAttribute(): string
    {
        if ($this->quantity > 0) {
            return 'text-emerald-600 dark:text-emerald-400';
        } elseif ($this->quantity < 0) {
            return 'text-red-600 dark:text-red-400';
        }
        return 'text-slate-600 dark:text-slate-400';
    }

    /**
     * Get formatted quantity with sign
     */
    public function getFormattedQuantityAttribute(): string
    {
        if ($this->quantity > 0) {
            return '+' . $this->quantity;
        }
        return (string) $this->quantity;
    }

    // =========================================================================
    // Static Helper Methods
    // =========================================================================

    /**
     * Get current stock for a drug
     */
    public static function getCurrentStock($drugId): int
    {
        return (int) self::where('drug_id', $drugId)->sum('quantity');
    }

    /**
     * Get stock summary for a drug
     */
    public static function getStockSummary($drugId): array
    {
        return [
            'total_added' => (int) self::where('drug_id', $drugId)
                ->where('quantity', '>', 0)
                ->sum('quantity'),
            'total_removed' => (int) self::where('drug_id', $drugId)
                ->where('quantity', '<', 0)
                ->sum('quantity'),
            'balance' => (int) self::where('drug_id', $drugId)->sum('quantity'),
        ];
    }

    /**
     * Get transactions grouped by type
     */
    public static function getSummaryByType($drugId): array
    {
        return self::where('drug_id', $drugId)
            ->select('transaction_type')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('SUM(quantity) as total_quantity')
            ->groupBy('transaction_type')
            ->get()
            ->toArray();
    }

    /**
     * Record a stock movement
     */
    public static function recordMovement(array $data): self
    {
        // Calculate balance after
        $currentBalance = self::getCurrentStock($data['drug_id']);
        $data['balance_after'] = $currentBalance + $data['quantity'];

        // Ensure transaction_date is set
        if (!isset($data['transaction_date'])) {
            $data['transaction_date'] = now();
        }

        return self::create($data);
    }
}
