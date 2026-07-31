<?php


namespace App\Models;

use App\Helpers\NumberGenerator;
use App\Models\BulkStores\BulkStore;
use App\Models\BulkStores\BulkStoreItem;
use App\Models\BulkStores\StockBatch;
use App\Models\BulkStores\StockMovement;
use App\Models\BulkStores\PurchaseOrder;
use App\Models\BulkStores\PurchaseRequisition;
use App\Models\BulkStores\GoodsReceivedNote;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\Patients\Patient;
use App\Models\Departments\Department;
use App\Models\Payments\Invoice;
use App\Models\Supplier;
use App\Models\Patients\Patient as Customer;

class StoreLedger extends Model
{
    use SoftDeletes;

    protected $table = 'store_ledgers';

    protected $fillable = [
        'uuid',
        'transaction_no',
        'transaction_date',
        'store_id',
        'department_id',
        'product_id',
        'batch_id',
        'supplier_id',
        'customer_id',
        'patient_id',
        'employee_id',
        'from_store_id',
        'to_store_id',
        'transaction_type',
        'reference_type',
        'reference_id',
        'purchase_order_id',
        'purchase_requisition_id',
        'goods_receipt_id',
        'issue_id',
        'transfer_id',
        'adjustment_id',
        'invoice_id',
        'quantity_in',
        'quantity_out',
        'running_balance',
        'unit_cost',
        'total_cost',
        'average_cost',
        'expiry_date',
        'manufacture_date',
        'serial_number',
        'remarks',
        'status',
        'created_by',
        'approved_by',
        'posted_by',
        'deleted_by',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
        'expiry_date' => 'date',
        'manufacture_date' => 'date',
        'quantity_in' => 'decimal:3',
        'quantity_out' => 'decimal:3',
        'running_balance' => 'decimal:3',
        'unit_cost' => 'decimal:4',
        'total_cost' => 'decimal:2',
        'average_cost' => 'decimal:4',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Transaction Types
    const TYPE_OPENING_BALANCE = 'opening_balance';
    const TYPE_RECEIPT = 'receipt';
    const TYPE_ISSUE = 'issue';
    const TYPE_RETURN_IN = 'return_in';
    const TYPE_RETURN_OUT = 'return_out';
    const TYPE_TRANSFER_IN = 'transfer_in';
    const TYPE_TRANSFER_OUT = 'transfer_out';
    const TYPE_ADJUSTMENT_POSITIVE = 'adjustment_positive';
    const TYPE_ADJUSTMENT_NEGATIVE = 'adjustment_negative';
    const TYPE_STOCK_COUNT = 'stock_count';
    const TYPE_EXPIRY = 'expiry';
    const TYPE_DAMAGE = 'damage';
    const TYPE_LOSS = 'loss';
    const TYPE_DONATION_IN = 'donation_in';
    const TYPE_DONATION_OUT = 'donation_out';
    const TYPE_PRODUCTION = 'production';
    const TYPE_CONSUMPTION = 'consumption';

    // Status Constants
    const STATUS_DRAFT = 'draft';
    const STATUS_POSTED = 'posted';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_REVERSED = 'reversed';

    // Boot method
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->transaction_no)) {
                $model->transaction_no = NumberGenerator::generate('SL', self::class);
            }
            if (empty($model->transaction_date)) {
                $model->transaction_date = now();
            }
        });
    }

    // ============================================
    // RELATIONSHIPS
    // ============================================

    /**
     * Get the store (bulk store) for this ledger entry
     */
    public function store()
    {
        return $this->belongsTo(BulkStore::class, 'store_id');
    }

    /**
     * Get the source store (for transfers)
     */
    public function fromStore()
    {
        return $this->belongsTo(BulkStore::class, 'from_store_id');
    }

    /**
     * Get the destination store (for transfers)
     */
    public function toStore()
    {
        return $this->belongsTo(BulkStore::class, 'to_store_id');
    }

    /**
     * Get the bulk store item (batch) for this ledger entry
     */
    public function bulkStoreItem()
    {
        return $this->belongsTo(BulkStoreItem::class, 'batch_id');
    }

    /**
     * Get the stock batch for this ledger entry
     */
    public function batch()
    {
        return $this->belongsTo(StockBatch::class, 'batch_id');
    }

    /**
     * Get the stock movement linked to this ledger entry
     */
    public function stockMovement()
    {
        return $this->belongsTo(StockMovement::class, 'reference_id')
            ->where('reference_type', 'stock_movement');
    }

    /**
     * Get the product for this ledger entry
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the department for this ledger entry
     */
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the supplier for this ledger entry
     */
    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Get the patient for this ledger entry
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Get the customer for this ledger entry
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the employee/user for this ledger entry
     */
    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    /**
     * Get the purchase order linked to this ledger entry
     */
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /**
     * Get the purchase requisition linked to this ledger entry
     */
    public function purchaseRequisition()
    {
        return $this->belongsTo(PurchaseRequisition::class);
    }

    /**
     * Get the goods received note linked to this ledger entry
     */
    public function goodsReceipt()
    {
        return $this->belongsTo(GoodsReceivedNote::class, 'goods_receipt_id');
    }

    /**
     * Get the invoice linked to this ledger entry
     */
    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Get the user who created this ledger entry
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who approved this ledger entry
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the user who posted this ledger entry
     */
    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    /**
     * Get the user who deleted this ledger entry
     */
    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    // ============================================
    // SCOPES
    // ============================================

    /**
     * Scope to get only posted entries
     */
    public function scopePosted($query)
    {
        return $query->where('status', self::STATUS_POSTED);
    }

    /**
     * Scope to get only draft entries
     */
    public function scopeDraft($query)
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    /**
     * Scope to get entries for a specific store
     */
    public function scopeByStore($query, $storeId)
    {
        return $query->where('store_id', $storeId);
    }

    /**
     * Scope to get entries for a specific product
     */
    public function scopeByProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Scope to get entries by transaction type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('transaction_type', $type);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeByDateRange($query, $from, $to)
    {
        return $query->whereBetween('transaction_date', [$from, $to]);
    }

    /**
     * Scope to get entries for a specific department
     */
    public function scopeByDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    /**
     * Scope to get entries for a specific patient
     */
    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    /**
     * Scope to get only receipt entries (stock in)
     */
    public function scopeReceipts($query)
    {
        return $query->whereIn('transaction_type', [
            self::TYPE_RECEIPT,
            self::TYPE_TRANSFER_IN,
            self::TYPE_RETURN_IN,
            self::TYPE_DONATION_IN,
            self::TYPE_OPENING_BALANCE,
            self::TYPE_ADJUSTMENT_POSITIVE,
            self::TYPE_PRODUCTION,
        ]);
    }

    /**
     * Scope to get only issue entries (stock out)
     */
    public function scopeIssues($query)
    {
        return $query->whereIn('transaction_type', [
            self::TYPE_ISSUE,
            self::TYPE_TRANSFER_OUT,
            self::TYPE_RETURN_OUT,
            self::TYPE_DONATION_OUT,
            self::TYPE_CONSUMPTION,
            self::TYPE_ADJUSTMENT_NEGATIVE,
            self::TYPE_EXPIRY,
            self::TYPE_DAMAGE,
            self::TYPE_LOSS,
        ]);
    }

    /**
     * Scope to get transfer entries
     */
    public function scopeTransfers($query)
    {
        return $query->whereIn('transaction_type', [
            self::TYPE_TRANSFER_IN,
            self::TYPE_TRANSFER_OUT,
        ]);
    }

    // ============================================
    // ACCESSORS
    // ============================================

    /**
     * Get human-readable transaction type label
     */
    public function getTransactionTypeLabelAttribute(): string
    {
        $labels = [
            'opening_balance' => 'Opening Balance',
            'receipt' => 'Receipt',
            'issue' => 'Issue',
            'return_in' => 'Return In',
            'return_out' => 'Return Out',
            'transfer_in' => 'Transfer In',
            'transfer_out' => 'Transfer Out',
            'adjustment_positive' => 'Adjustment (+)',
            'adjustment_negative' => 'Adjustment (-)',
            'stock_count' => 'Stock Count',
            'expiry' => 'Expiry',
            'damage' => 'Damage',
            'loss' => 'Loss',
            'donation_in' => 'Donation In',
            'donation_out' => 'Donation Out',
            'production' => 'Production',
            'consumption' => 'Consumption',
        ];
        return $labels[$this->transaction_type] ?? ucfirst(str_replace('_', ' ', $this->transaction_type));
    }

    /**
     * Get human-readable status label
     */
    public function getStatusLabelAttribute(): string
    {
        $labels = [
            'draft' => 'Draft',
            'posted' => 'Posted',
            'cancelled' => 'Cancelled',
            'reversed' => 'Reversed',
        ];
        return $labels[$this->status] ?? ucfirst($this->status);
    }

    /**
     * Get status color for UI
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'warning',
            'posted' => 'success',
            'cancelled' => 'danger',
            'reversed' => 'secondary',
            default => 'secondary',
        };
    }

    /**
     * Get transaction direction (IN or OUT)
     */
    public function getDirectionAttribute(): string
    {
        $inTypes = [
            'opening_balance',
            'receipt',
            'return_in',
            'transfer_in',
            'adjustment_positive',
            'donation_in',
            'production'
        ];
        return in_array($this->transaction_type, $inTypes) ? 'IN' : 'OUT';
    }

    /**
     * Get direction icon
     */
    public function getDirectionIconAttribute(): string
    {
        return $this->direction === 'IN' ? '⬇️' : '⬆️';
    }

    /**
     * Get direction badge color
     */
    public function getDirectionColorAttribute(): string
    {
        return $this->direction === 'IN' ? 'success' : 'danger';
    }

    /**
     * Get net quantity change
     */
    public function getNetQuantityAttribute(): float
    {
        return $this->quantity_in - $this->quantity_out;
    }

    /**
     * Get total value of this transaction
     */
    public function getValueAttribute(): float
    {
        return $this->net_quantity * ($this->unit_cost ?? 0);
    }

    /**
     * Get formatted transaction date
     */
    public function getFormattedDateAttribute(): string
    {
        return $this->transaction_date ? $this->transaction_date->format('Y-m-d H:i:s') : '';
    }

    /**
     * Get transaction summary for display
     */
    public function getSummaryAttribute(): string
    {
        $productName = $this->product->product_name ?? 'Unknown Product';
        $storeName = $this->store->name ?? 'Unknown Store';
        $direction = $this->direction;
        $quantity = $this->net_quantity;

        return "{$direction} {$quantity} of {$productName} at {$storeName}";
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Check if transaction can be posted
     */
    public function canPost(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    /**
     * Check if transaction can be cancelled
     */
    public function canCancel(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_POSTED]);
    }

    /**
     * Check if transaction can be reversed
     */
    public function canReverse(): bool
    {
        return $this->status === self::STATUS_POSTED;
    }

    /**
     * Post the transaction
     */
    public function post(): void
    {
        if (!$this->canPost()) {
            throw new \Exception('Transaction cannot be posted. Current status: ' . $this->status);
        }

        $this->update([
            'status' => self::STATUS_POSTED,
            'posted_at' => now(),
        ]);
    }

    /**
     * Cancel the transaction
     */
    public function cancel(string $reason = null): void
    {
        if (!$this->canCancel()) {
            throw new \Exception('Transaction cannot be cancelled. Current status: ' . $this->status);
        }

        $this->update([
            'status' => self::STATUS_CANCELLED,
            'remarks' => $reason ? "Cancelled: {$reason}" : $this->remarks,
    
        ]);
    }

    /**
     * Reverse the transaction (create reversal entry)
     */
    public function reverse(): StoreLedger
    {
        if (!$this->canReverse()) {
            throw new \Exception('Transaction cannot be reversed. Current status: ' . $this->status);
        }

        // Create reversing entry
        $reversal = $this->replicate();
        $reversal->transaction_type = $this->direction === 'IN'
            ? self::TYPE_ADJUSTMENT_NEGATIVE
            : self::TYPE_ADJUSTMENT_POSITIVE;
        $reversal->quantity_in = $this->quantity_out;
        $reversal->quantity_out = $this->quantity_in;
        $reversal->running_balance = $this->running_balance - $this->net_quantity;
        $reversal->remarks = "Reversal of transaction #{$this->transaction_no}";
        $reversal->reference_type = 'reversal';
        $reversal->reference_id = $this->id;
        $reversal->status = self::STATUS_POSTED;
        $reversal->transaction_no = NumberGenerator::generate('SL', self::class);
        $reversal->save();

        // Mark original as reversed
        $this->update([
            'status' => self::STATUS_REVERSED,
            'remarks' => ($this->remarks ? $this->remarks . ' | ' : '')
                . "Reversed by reversal #{$reversal->transaction_no}",
        ]);

        return $reversal;
    }

    /**
     * Get the running balance for a product in a store before this transaction
     */
    public static function getRunningBalance(int $storeId, int $productId, $beforeDate = null): float
    {
        $query = self::where('store_id', $storeId)
            ->where('product_id', $productId)
            ->where('status', self::STATUS_POSTED);

        if ($beforeDate) {
            $query->where('transaction_date', '<', $beforeDate);
        }

        $last = $query->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->first();

        return $last ? $last->running_balance : 0;
    }

    /**
     * Calculate the new running balance
     */
    public function calculateRunningBalance(): float
    {
        $previousBalance = self::getRunningBalance(
            $this->store_id,
            $this->product_id,
            $this->transaction_date
        );

        return $previousBalance + $this->quantity_in - $this->quantity_out;
    }

    /**
     * Get all ledger entries for a product in a store
     */
    public static function getProductLedger(int $productId, ?int $storeId = null, $from = null, $to = null)
    {
        $query = self::where('product_id', $productId)
            ->where('status', self::STATUS_POSTED)
            ->orderBy('transaction_date', 'asc');

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        if ($from) {
            $query->where('transaction_date', '>=', $from);
        }

        if ($to) {
            $query->where('transaction_date', '<=', $to);
        }

        return $query->get();
    }

    /**
     * Get store stock summary
     */
    public static function getStoreStockSummary(int $storeId)
    {
        return self::where('store_id', $storeId)
            ->where('status', self::STATUS_POSTED)
            ->select('product_id')
            ->selectRaw('MAX(running_balance) as current_balance')
            ->selectRaw('AVG(unit_cost) as avg_cost')
            ->groupBy('product_id')
            ->get();
    }
}
