<?php

namespace App\Models\BulkStores;

use App\Helpers\NumberGenerator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrder extends Model
{
    use SoftDeletes;

    protected $table = 'purchase_orders';

    protected $fillable = [
        'po_number',
        'po_number_id',
        'requisition_id',
        'supplier_id',
        'status',
        'order_date',
        'expected_delivery_date',
        'received_date',
        'created_by',
        'approved_by',
        'approved_at',
        'notes',
        'payment_terms',
        'delivery_address',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'currency',
        'budget_code',
        'cost_center',
        'attachments',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'order_date' => 'date',
        'expected_delivery_date' => 'date',
        'received_date' => 'date',
        'approved_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'po_number_id' => 'integer',
        'attachments' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // ============================================
    // STATUS CONSTANTS
    // ============================================

    const STATUS_DRAFT = 'draft';
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_PARTIALLY_RECEIVED = 'partially_received';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    const STATUS_LABELS = [
        self::STATUS_DRAFT => 'Draft',
        self::STATUS_PENDING => 'Pending Approval',
        self::STATUS_APPROVED => 'Approved',
        self::STATUS_PARTIALLY_RECEIVED => 'Partially Received',
        self::STATUS_COMPLETED => 'Completed',
        self::STATUS_CANCELLED => 'Cancelled',
    ];

    const STATUS_COLORS = [
        self::STATUS_DRAFT => 'secondary',
        self::STATUS_PENDING => 'warning',
        self::STATUS_APPROVED => 'info',
        self::STATUS_PARTIALLY_RECEIVED => 'orange',
        self::STATUS_COMPLETED => 'success',
        self::STATUS_CANCELLED => 'danger',
    ];

    // ============================================
    // BOOT METHOD
    // ============================================

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            // Auto-generate PO number
            if (empty($model->po_number)) {
                $model->po_number = NumberGenerator::generatePONumber();
            }
            // Auto-generate PO number ID (numeric sequence)
            if (empty($model->po_number_id)) {
                $model->po_number_id = self::generatePONumberId();
            }
            // Auto-set order date
            if (empty($model->order_date)) {
                $model->order_date = now();
            }
            // Auto-set created_by
            if (empty($model->created_by)) {
                $model->created_by = auth()->id();
            }
            // Auto-set currency
            if (empty($model->currency)) {
                $model->currency = 'ZMW';
            }
            // Auto-set status to draft
            if (empty($model->status)) {
                $model->status = self::STATUS_DRAFT;
            }
        });
    }

    // ============================================
    // RELATIONSHIPS
    // ============================================

    /**
     * Get the requisition that this PO was created from
     */
    public function requisition()
    {
        return $this->belongsTo(PurchaseRequisition::class, 'requisition_id');
    }

    /**
     * Get the supplier for this PO
     */
    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Get the user who created this PO
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who approved this PO
     */
    public function approver()
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    /**
     * Get the items for this PO
     */
    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class, 'purchase_order_id');
    }

    /**
     * Get the goods received notes for this PO
     */
    public function goodsReceivedNotes()
    {
        return $this->hasMany(GoodsReceivedNote::class, 'purchase_order_id');
    }

    /**
     * Get the budget allocation for this PO
     */
    public function budgetAllocation()
    {
        return $this->belongsTo(BudgetAllocation::class, 'budget_code', 'budget_code');
    }

    // ============================================
    // SCOPES
    // ============================================

    /**
     * Scope to get only pending POs
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope to get only approved POs
     */
    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    /**
     * Scope to get only completed POs
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope to get active POs (approved or partially received)
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', [
            self::STATUS_APPROVED,
            self::STATUS_PARTIALLY_RECEIVED,
        ]);
    }

    /**
     * Scope to filter by supplier
     */
    public function scopeBySupplier($query, $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }

    /**
     * Scope to filter by budget code
     */
    public function scopeByBudget($query, $budgetCode)
    {
        return $query->where('budget_code', $budgetCode);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeByDateRange($query, $from, $to)
    {
        return $query->whereBetween('order_date', [$from, $to]);
    }

    // ============================================
    // ACCESSORS
    // ============================================

    /**
     * Get human-readable status label
     */
    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? ucfirst($this->status);
    }

    /**
     * Get status color for UI
     */
    public function getStatusColorAttribute(): string
    {
        return self::STATUS_COLORS[$this->status] ?? 'secondary';
    }

    /**
     * Get total items count
     */
    public function getTotalItemsAttribute(): int
    {
        return $this->items->count();
    }

    /**
     * Get total quantity of all items
     */
    public function getTotalQuantityAttribute(): float
    {
        return $this->items->sum('qty_ordered');
    }

    /**
     * Get total received quantity
     */
    public function getTotalReceivedAttribute(): float
    {
        return $this->items->sum('qty_received');
    }

    /**
     * Get receipt progress percentage
     */
    public function getReceiptProgressAttribute(): float
    {
        $totalOrdered = $this->total_quantity;
        if ($totalOrdered <= 0) {
            return 0;
        }
        return round(($this->total_received / $totalOrdered) * 100, 2);
    }

    /**
     * Check if PO is fully received
     */
    public function getIsFullyReceivedAttribute(): bool
    {
        return $this->items->every(function ($item) {
            return $item->qty_received >= $item->qty_ordered;
        });
    }

    /**
     * Check if PO can be edited
     */
    public function getCanEditAttribute(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_PENDING]);
    }

    /**
     * Check if PO can be approved
     */
    public function getCanApproveAttribute(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if PO can be received
     */
    public function getCanReceiveAttribute(): bool
    {
        return in_array($this->status, [
            self::STATUS_APPROVED,
            self::STATUS_PARTIALLY_RECEIVED,
        ]);
    }

    /**
     * Check if PO can be cancelled
     */
    public function getCanCancelAttribute(): bool
    {
        return !in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_CANCELLED]);
    }

    /**
     * Get full PO display (with both number formats)
     */
    public function getFullPoDisplayAttribute(): string
    {
        return $this->po_number . ' (#' . $this->po_number_id . ')';
    }

    /**
     * Get formatted order date
     */
    public function getFormattedOrderDateAttribute(): string
    {
        return $this->order_date ? $this->order_date->format('d M Y') : 'N/A';
    }

    /**
     * Get formatted expected delivery date
     */
    public function getFormattedExpectedDeliveryDateAttribute(): string
    {
        return $this->expected_delivery_date ? $this->expected_delivery_date->format('d M Y') : 'N/A';
    }

    /**
     * Get formatted total amount
     */
    public function getFormattedTotalAttribute(): string
    {
        return number_format($this->total_amount, 2);
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Generate PO Number ID (numeric sequence)
     * Resets every year
     */
    public static function generatePONumberId(): int
    {
        $year = date('Y');
        $last = self::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        if ($last && $last->po_number_id) {
            return $last->po_number_id + 1;
        }

        return 1;
    }

    /**
     * Calculate totals from items
     */
    public function calculateTotals(): void
    {
        $subtotal = $this->items->sum('total_price');
        $tax = $subtotal * 0.16; // 16% VAT
        $discount = 0; // Can be calculated based on items or PO level
        $total = $subtotal + $tax - $discount;

        $this->update([
            'subtotal' => $subtotal,
            'tax_amount' => $tax,
            'discount_amount' => $discount,
            'total_amount' => $total,
        ]);
    }

    /**
     * Update PO status based on received quantities
     */
    public function updateStatus(): void
    {
        if ($this->status === self::STATUS_CANCELLED) {
            return;
        }

        if ($this->items->isEmpty()) {
            return;
        }

        $allFulfilled = $this->items->every(function ($item) {
            return $item->qty_received >= $item->qty_ordered;
        });

        $anyReceived = $this->items->some(function ($item) {
            return $item->qty_received > 0;
        });

        if ($allFulfilled) {
            $this->update([
                'status' => self::STATUS_COMPLETED,
                'received_date' => now(),
            ]);
        } elseif ($anyReceived) {
            $this->update([
                'status' => self::STATUS_PARTIALLY_RECEIVED,
            ]);
        }
    }

    /**
     * Approve PO
     */
    public function approve(User $approver): void
    {
        if (!$this->can_approve) {
            throw new \Exception('Only pending purchase orders can be approved');
        }

        $this->update([
            'status' => self::STATUS_APPROVED,
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);
    }

    /**
     * Cancel PO
     */
    public function cancel(string $reason = null): void
    {
        if (!$this->can_cancel) {
            throw new \Exception('This purchase order cannot be cancelled');
        }

        $this->update([
            'status' => self::STATUS_CANCELLED,
            'notes' => $reason ? "Cancelled: {$reason}" : $this->notes,
        ]);
    }

    /**
     * Check if budget is sufficient
     */
    public function hasSufficientBudget(): bool
    {
        $budget = $this->budgetAllocation;
        if (!$budget) {
            return false;
        }
        return $budget->available_amount >= $this->total_amount;
    }

    /**
     * Get PO summary
     */
    public function getSummary(): array
    {
        return [
            'id' => $this->id,
            'po_number' => $this->po_number,
            'po_number_id' => $this->po_number_id,
            'full_po_display' => $this->full_po_display,
            'requisition' => $this->requisition->pr_number ?? 'N/A',
            'supplier' => $this->supplier->name ?? 'N/A',
            'status' => $this->status_label,
            'status_color' => $this->status_color,
            'order_date' => $this->formatted_order_date,
            'expected_delivery' => $this->formatted_expected_delivery_date,
            'total_items' => $this->total_items,
            'total_quantity' => $this->total_quantity,
            'total_received' => $this->total_received,
            'receipt_progress' => $this->receipt_progress,
            'subtotal' => $this->subtotal,
            'tax' => $this->tax_amount,
            'total' => $this->total_amount,
            'budget_code' => $this->budget_code,
            'can_edit' => $this->can_edit,
            'can_approve' => $this->can_approve,
            'can_receive' => $this->can_receive,
            'can_cancel' => $this->can_cancel,
        ];
    }
}