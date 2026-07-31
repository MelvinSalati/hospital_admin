<?php
// app/Models/ProductAdjustment.php

namespace App\Models\Bulkstores;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ProductAdjustment extends Model
{
    protected $table = 'product_adjustments';

    protected $fillable = [
        'adjustment_uuid',
        'adjustment_number',
        'product_id',
        'department_id',
        'bulk_store_id',
        'current_stock',
        'proposed_quantity',
        'adjustment_difference',
        'adjustment_type',
        'category',
        'batch_number',
        'expiry_date',
        'unit_cost',
        'reason',
        'remarks',
        'evidence',
        'status',
        'approval_required',
        'approval_level',
        'total_approval_levels',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'applied_at',
        'applied_by',
        'created_by',
        'requested_by',
        'requested_at',
        'updated_by',
        'metadata',
    ];

    protected $casts = [
        'evidence' => 'array',
        'metadata' => 'array',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'applied_at' => 'datetime',
        'requested_at' => 'datetime',
        'expiry_date' => 'date',
        'current_stock' => 'integer',
        'proposed_quantity' => 'integer',
        'adjustment_difference' => 'integer',
        'unit_cost' => 'decimal:2',
        'approval_level' => 'integer',
        'total_approval_levels' => 'integer',
    ];

    // ============================================
    // BOOT METHOD
    // ============================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->adjustment_uuid = $model->adjustment_uuid ?? (string) \Str::uuid();
            $model->adjustment_number = $model->adjustment_number ?? self::generateNumber();
            $model->created_by = $model->created_by ?? Auth::id();
            
            // Calculate adjustment type and difference
            if (empty($model->adjustment_difference)) {
                $model->adjustment_difference = $model->proposed_quantity - $model->current_stock;
                $model->adjustment_type = $model->adjustment_difference > 0 ? 'addition' : 'reduction';
            }
            
            // Check if approval is required
            if (empty($model->approval_required)) {
                $model->approval_required = $model->adjustment_difference < 0;
            }
            
            // Set initial status
            if (empty($model->status)) {
                $model->status = $model->approval_required ? 'pending' : 'draft';
            }
        });

        static::updating(function ($model) {
            $model->updated_by = Auth::id();
        });
    }

    // ============================================
    // RELATIONSHIPS
    // ============================================

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function bulkStore()
    {
        return $this->belongsTo(BulkStore::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejecter()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function applier()
    {
        return $this->belongsTo(User::class, 'applied_by');
    }

    public function approvalHistory()
    {
        return $this->hasMany(AdjustmentApprovalHistory::class)->orderBy('created_at', 'asc');
    }

    // ============================================
    // ACCESSORS
    // ============================================

    public function getStatusLabelAttribute()
    {
        return [
            'draft' => 'Draft',
            'pending' => 'Pending Approval',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'cancelled' => 'Cancelled',
            'applied' => 'Applied',
        ][$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        return [
            'draft' => 'gray',
            'pending' => 'yellow',
            'approved' => 'green',
            'rejected' => 'red',
            'cancelled' => 'gray',
            'applied' => 'blue',
        ][$this->status] ?? 'gray';
    }

    public function getTypeLabelAttribute()
    {
        return [
            'addition' => 'Stock Addition (+)',
            'reduction' => 'Stock Reduction (-)',
        ][$this->adjustment_type] ?? $this->adjustment_type;
    }

    public function getCategoryLabelAttribute()
    {
        return [
            'correction' => 'Correction',
            'damage' => 'Damage',
            'expiry' => 'Expiry',
            'shortage' => 'Shortage',
            'surplus' => 'Surplus',
            'quality_issue' => 'Quality Issue',
            'theft' => 'Theft',
            'return_supplier' => 'Return to Supplier',
            'return_customer' => 'Customer Return',
        ][$this->category] ?? $this->category;
    }

    public function getIsNegativeAttribute()
    {
        return $this->adjustment_difference < 0;
    }

    public function getIsPendingAttribute()
    {
        return $this->status === 'pending';
    }

    public function getIsApprovedAttribute()
    {
        return $this->status === 'approved';
    }

    public function getIsAppliedAttribute()
    {
        return $this->status === 'applied';
    }

    public function getCanApproveAttribute()
    {
        return $this->status === 'pending' && $this->approval_required;
    }

    public function getCanApplyAttribute()
    {
        return $this->status === 'approved';
    }

    public function getCanCancelAttribute()
    {
        return in_array($this->status, ['draft', 'pending']);
    }

    // ============================================
    // SCOPES
    // ============================================

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeApplied($query)
    {
        return $query->where('status', 'applied');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    public function scopeNegative($query)
    {
        return $query->where('adjustment_difference', '<', 0);
    }

    public function scopePositive($query)
    {
        return $query->where('adjustment_difference', '>', 0);
    }

    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    // ============================================
    // METHODS
    // ============================================

    /**
     * Generate unique adjustment number
     */
    public static function generateNumber(): string
    {
        $prefix = 'ADJ';
        $year = date('Y');
        $month = date('m');
        $seq = self::whereYear('created_at', $year)->count() + 1;
        
        return "{$prefix}-{$year}{$month}-" . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Submit for approval
     */
    public function submitForApproval()
    {
        if ($this->status !== 'draft') {
            throw new \Exception('Only draft adjustments can be submitted for approval');
        }

        if ($this->adjustment_difference === 0) {
            throw new \Exception('No change in stock quantity');
        }

        $this->status = 'pending';
        $this->requested_by = Auth::id();
        $this->requested_at = now();
        $this->approval_required = true;
        $this->save();

        // Log approval history
        $this->logHistory('submitted', 'Adjustment submitted for approval');

        return $this;
    }

    /**
     * Approve the adjustment
     */
    public function approve($userId = null, $notes = null)
    {
        if ($this->status !== 'pending') {
            throw new \Exception('Only pending adjustments can be approved');
        }

        $this->status = 'approved';
        $this->approved_by = $userId ?? Auth::id();
        $this->approved_at = now();
        $this->approval_level = ($this->approval_level ?? 0) + 1;
        $this->remarks = $notes ? "Approved: {$notes}" : $this->remarks;
        $this->save();

        // Log approval history
        $this->logHistory('approved', $notes);

        // Auto-apply if no more approval levels needed
        if ($this->approval_level >= ($this->total_approval_levels ?? 1)) {
            $this->apply();
        }

        return $this;
    }

    /**
     * Reject the adjustment
     */
    public function reject($userId = null, $reason = null)
    {
        if ($this->status !== 'pending') {
            throw new \Exception('Only pending adjustments can be rejected');
        }

        $this->status = 'rejected';
        $this->rejected_by = $userId ?? Auth::id();
        $this->rejected_at = now();
        $this->rejection_reason = $reason;
        $this->save();

        // Log rejection history
        $this->logHistory('rejected', $reason);

        return $this;
    }

    /**
     * Apply the adjustment to actual stock
     */
    public function apply()
    {
        if ($this->status !== 'approved' && $this->status !== 'pending') {
            throw new \Exception('Only approved or pending adjustments can be applied');
        }

        return DB::transaction(function () {
            // Get department product
            $departmentProduct = DepartmentProduct::where('department_id', $this->department_id)
                ->where('product_id', $this->product_id)
                ->where('bulk_store_id', $this->bulk_store_id)
                ->first();

            if (!$departmentProduct) {
                throw new \Exception('Product not found in this department');
            }

            // Verify current stock matches
            if ($departmentProduct->current_stock != $this->current_stock) {
                throw new \Exception(
                    "Stock has changed since adjustment was created. " .
                    "Current: {$departmentProduct->current_stock}, " .
                    "Expected: {$this->current_stock}"
                );
            }

            $newStock = $departmentProduct->current_stock + $this->adjustment_difference;

            // Prevent negative stock
            if ($newStock < 0) {
                throw new \Exception("Insufficient stock. Would result in negative stock");
            }

            // Update department product stock
            $departmentProduct->current_stock = $newStock;
            $departmentProduct->last_movement_at = now();
            $departmentProduct->save();

            // Create stock movement record
            $movement = StockMovement::create([
                'movement_uuid' => (string) \Str::uuid(),
                'product_id' => $this->product_id,
                'department_id' => $this->department_id,
                'bulk_store_id' => $this->bulk_store_id,
                'from_department_id' => $this->department_id,
                'to_department_id' => $this->department_id,
                'created_by' => Auth::id(),
                'type' => 'adjustment',
                'quantity' => abs($this->adjustment_difference),
                'balance_before' => $departmentProduct->current_stock - $this->adjustment_difference,
                'balance_after' => $departmentProduct->current_stock,
                'reference_number' => $this->adjustment_number,
                'batch_number' => $this->batch_number,
                'expiry_date' => $this->expiry_date,
                'unit_cost' => $this->unit_cost,
                'remarks' => "Applied from adjustment #{$this->adjustment_number}: {$this->reason}",
                'moved_at' => now(),
            ]);

            // Update adjustment status
            $this->status = 'applied';
            $this->applied_by = Auth::id();
            $this->applied_at = now();
            $this->save();

            // Log application
            $this->logHistory('applied', 'Adjustment applied to stock');

            return $movement;
        });
    }

    /**
     * Cancel the adjustment
     */
    public function cancel($reason = null)
    {
        if (!in_array($this->status, ['draft', 'pending'])) {
            throw new \Exception('Only draft or pending adjustments can be cancelled');
        }

        $this->status = 'cancelled';
        $this->remarks = $reason ? "Cancelled: {$reason}" : $this->remarks;
        $this->save();

        $this->logHistory('cancelled', $reason);

        return $this;
    }

    /**
     * Log approval history
     */
    protected function logHistory($action, $notes = null)
    {
        AdjustmentApprovalHistory::create([
            'adjustment_id' => $this->id,
            'action' => $action,
            'level' => $this->approval_level ?? 1,
            'performed_by' => Auth::id(),
            'notes' => $notes,
        ]);
    }

    /**
     * Check if adjustment can be edited
     */
    public function canEdit()
    {
        return in_array($this->status, ['draft', 'pending']);
    }

    /**
     * Get approval status summary
     */
    public function getApprovalStatusSummary()
    {
        return [
            'status' => $this->status,
            'status_label' => $this->status_label,
            'status_color' => $this->status_color,
            'requires_approval' => $this->approval_required,
            'current_level' => $this->approval_level,
            'total_levels' => $this->total_approval_levels ?? 1,
            'is_fully_approved' => $this->status === 'approved',
            'is_applied' => $this->status === 'applied',
        ];
    }

    /**
     * Get evidence URLs
     */
    public function getEvidenceUrls()
    {
        return $this->evidence ?? [];
    }
}