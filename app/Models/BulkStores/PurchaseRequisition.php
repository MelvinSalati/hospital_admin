<?php

namespace App\Models\BulkStores;

use App\Helpers\NumberGenerator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\BulkStores\PurchaseRequisitionItem;
use App\Models\Departments\Department;

class PurchaseRequisition extends Model
{
    use SoftDeletes;

    protected $table = 'purchase_requisitions';

    protected $fillable = [
        'pr_number',
        'supplier_id',
        'requisition_id',
        'department_id',
        'requested_by',
        'request_date',
        'required_date',
        'priority',
        'status',
        'justification',
        'estimated_total',
        'budget_code',
        'cost_center',
        'approved_by',
        'approved_at',
        'converted_to_po_id',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'request_date' => 'date',
        'required_date' => 'date',
        'approved_at' => 'datetime',
        'estimated_total' => 'decimal:2',
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
    const STATUS_REJECTED = 'rejected';
    const STATUS_CONVERTED = 'converted';
    const STATUS_CANCELLED = 'cancelled';

    const STATUS_LABELS = [
        self::STATUS_DRAFT => 'Draft',
        self::STATUS_PENDING => 'Pending Approval',
        self::STATUS_APPROVED => 'Approved',
        self::STATUS_REJECTED => 'Rejected',
        self::STATUS_CONVERTED => 'Converted to PO',
        self::STATUS_CANCELLED => 'Cancelled',
    ];

    const STATUS_COLORS = [
        self::STATUS_DRAFT => 'secondary',
        self::STATUS_PENDING => 'warning',
        self::STATUS_APPROVED => 'success',
        self::STATUS_REJECTED => 'danger',
        self::STATUS_CONVERTED => 'info',
        self::STATUS_CANCELLED => 'danger',
    ];

    // ============================================
    // PRIORITY CONSTANTS
    // ============================================

    const PRIORITY_LOW = 'low';
    const PRIORITY_MEDIUM = 'medium';
    const PRIORITY_HIGH = 'high';
    const PRIORITY_URGENT = 'urgent';

    const PRIORITY_LABELS = [
        self::PRIORITY_LOW => 'Low',
        self::PRIORITY_MEDIUM => 'Medium',
        self::PRIORITY_HIGH => 'High',
        self::PRIORITY_URGENT => 'Urgent',
    ];

    const PRIORITY_COLORS = [
        self::PRIORITY_LOW => 'info',
        self::PRIORITY_MEDIUM => 'primary',
        self::PRIORITY_HIGH => 'warning',
        self::PRIORITY_URGENT => 'danger',
    ];

    // ============================================
    // BOOT METHOD
    // ============================================

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            // Auto-generate PR number
            if (empty($model->pr_number)) {
                $model->pr_number = NumberGenerator::generatePRNumber();
            }
            // Auto-set request date
            if (empty($model->request_date)) {
                $model->request_date = now();
            }
            // Auto-set requested_by
            if (empty($model->requested_by)) {
                $model->requested_by = auth()->id();
            }
            // Auto-set status to pending
            if (empty($model->status)) {
                $model->status = self::STATUS_PENDING;
            }
        });
    }

    // ============================================
    // RELATIONSHIPS
    // ============================================

    /**
     * Get the department that requested this requisition
     */
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the user who requested this requisition
     */
    public function requester()
    {
        return $this->belongsTo(\App\Models\User::class, 'requested_by');
    }

    /**
     * Get the user who approved this requisition
     */
    public function approver()
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }
    public function supplier()
    {
        return $this->belongsTo(\App\Models\Suppliers\Supplier::class, 'supplier_id');
    }

    /**
     * Get the budget allocation for this requisition
     */
    public function budgetAllocation()
    {
        return $this->belongsTo(\App\Models\Budgets\BudgetAllocation::class, 'budget_code', 'budget_code');
    }

    /**
     * Get the items for this requisition
     */
public function items()
{
    return $this->hasMany(PurchaseRequisitionItem::class, 'requisition_id');
}

    /**
     * Get the purchase order created from this requisition
     */
    public function purchaseOrder()
    {
        return $this->belongsTo(\App\Models\BulkStores\PurchaseOrder::class, 'converted_to_po_id');
    }

    // ============================================
    // SCOPES
    // ============================================

    /**
     * Scope to get only pending requisitions
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope to get only approved requisitions
     */
    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    /**
     * Scope to get only draft requisitions
     */
    public function scopeDraft($query)
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    /**
     * Scope to get only converted requisitions
     */
    public function scopeConverted($query)
    {
        return $query->where('status', self::STATUS_CONVERTED);
    }

    /**
     * Scope to filter by department
     */
    public function scopeByDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
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
        return $query->whereBetween('created_at', [$from, $to]);
    }

    /**
     * Scope to get urgent requisitions
     */
    public function scopeUrgent($query)
    {
        return $query->where('priority', self::PRIORITY_URGENT);
    }

    /**
     * Scope to get high priority requisitions
     */
    public function scopeHighPriority($query)
    {
        return $query->whereIn('priority', [self::PRIORITY_HIGH, self::PRIORITY_URGENT]);
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
     * Get human-readable priority label
     */
    public function getPriorityLabelAttribute(): string
    {
        return self::PRIORITY_LABELS[$this->priority] ?? ucfirst($this->priority);
    }

    /**
     * Get priority color for UI
     */
    public function getPriorityColorAttribute(): string
    {
        return self::PRIORITY_COLORS[$this->priority] ?? 'secondary';
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
        return $this->items->sum('quantity');
    }

    /**
     * Check if requisition can be edited
     */
    public function getCanEditAttribute(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_PENDING]);
    }

    /**
     * Check if requisition can be approved
     */
    public function getCanApproveAttribute(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if requisition can be converted to PO
     */
    public function getCanConvertAttribute(): bool
    {
        return $this->status === self::STATUS_APPROVED && is_null($this->converted_to_po_id);
    }

    /**
     * Check if requisition can be cancelled
     */
    public function getCanCancelAttribute(): bool
    {
        return !in_array($this->status, [self::STATUS_CONVERTED, self::STATUS_CANCELLED]);
    }

    /**
     * Get formatted created date
     */
    public function getFormattedCreatedAtAttribute(): string
    {
        return $this->created_at ? $this->created_at->format('d M Y H:i') : 'N/A';
    }

    /**
     * Get formatted required date
     */
    public function getFormattedRequiredDateAttribute(): string
    {
        return $this->required_date ? $this->required_date->format('d M Y') : 'N/A';
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Calculate total from items
     */
    public function calculateTotal(): float
    {
        return $this->items->sum('estimated_total');
    }

    /**
     * Update estimated total
     */
    public function updateTotal(): void
    {
        $this->update([
            'estimated_total' => $this->calculateTotal()
        ]);
    }

    /**
     * Submit requisition for approval
     */
    public function submit(): void
    {
        if ($this->status !== self::STATUS_DRAFT) {
            throw new \Exception('Only draft requisitions can be submitted');
        }

        if ($this->items->isEmpty()) {
            throw new \Exception('Requisition must have at least one item');
        }

        $this->update([
            'status' => self::STATUS_PENDING,
        ]);
    }

    /**
     * Approve requisition
     */
    public function approve(User $approver): void
    {
        if ($this->status !== self::STATUS_PENDING) {
            throw new \Exception('Only pending requisitions can be approved');
        }

        $this->update([
            'status' => self::STATUS_APPROVED,
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);
    }

    /**
     * Reject requisition
     */
    public function reject(string $reason = null): void
    {
        if ($this->status !== self::STATUS_PENDING) {
            throw new \Exception('Only pending requisitions can be rejected');
        }

        $this->update([
            'status' => self::STATUS_REJECTED,
            'justification' => $reason ? "Rejected: {$reason}" : $this->justification,
        ]);
    }

    /**
     * Cancel requisition
     */
    public function cancel(string $reason = null): void
    {
        if (!$this->can_cancel) {
            throw new \Exception('This requisition cannot be cancelled');
        }

        $this->update([
            'status' => self::STATUS_CANCELLED,
            'justification' => $reason ? "Cancelled: {$reason}" : $this->justification,
        ]);
    }

    /**
     * Mark as converted to PO
     */
    public function markAsConverted(int $poId): void
    {
        if ($this->status !== self::STATUS_APPROVED) {
            throw new \Exception('Only approved requisitions can be converted');
        }

        $this->update([
            'status' => self::STATUS_CONVERTED,
            'converted_to_po_id' => $poId,
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
        return $budget->available_amount >= $this->estimated_total;
    }

    /**
     * Get requisition summary
     */
    public function getSummary(): array
    {
        return [
            'id' => $this->id,
            'pr_number' => $this->pr_number,
            'department' => $this->department->name ?? 'N/A',
            'requester' => $this->requester->name ?? 'N/A',
            'status' => $this->status_label,
            'status_color' => $this->status_color,
            'priority' => $this->priority_label,
            'priority_color' => $this->priority_color,
            'total_amount' => $this->estimated_total,
            'total_items' => $this->total_items,
            'total_quantity' => $this->total_quantity,
            'budget_code' => $this->budget_code,
            'required_date' => $this->formatted_required_date,
            'created_at' => $this->formatted_created_at,
            'can_edit' => $this->can_edit,
            'can_approve' => $this->can_approve,
            'can_convert' => $this->can_convert,
            'can_cancel' => $this->can_cancel,
        ];
    }
}
