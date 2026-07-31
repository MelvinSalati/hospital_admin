<?php

namespace App\Models\Budgets;

use App\Helpers\NumberGenerator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Budgets\BudgetCategory;
use App\Models\Budgets\BudgetPeriod;
use App\Models\Budgets\BudgetTransaction;
use App\Models\Budgets\BudgetAlert;
use Illuminate\Support\Str;
use App\Models\Departments\Department;
use App\Models\User;
use App\Models\Suppliers\Supplier;
use Illuminate\Support\Facades\Log;

class BudgetAllocation extends Model
{
    use SoftDeletes;

    protected $table = 'budget_allocations';

    protected $fillable = [
        'budget_code',
        'budget_name',
        'description',
        'category_id',
        'department_id',
        'supplier_id',
        'fiscal_year',
        'budget_type',
        'original_amount',
        'revised_amount',
        'allocated_amount',
        'reserved_amount',
        'committed_amount',
        'actual_spent',
        'available_amount',
        'utilization_percentage',
        'warning_threshold',
        'critical_threshold',
        'alert_triggered',
        'alert_message',
        'alert_triggered_at',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'original_amount' => 'decimal:2',
        'revised_amount' => 'decimal:2',
        'allocated_amount' => 'decimal:2',
        'reserved_amount' => 'decimal:2',
        'committed_amount' => 'decimal:2',
        'actual_spent' => 'decimal:2',
        'available_amount' => 'decimal:2',
        'utilization_percentage' => 'decimal:2',
        'warning_threshold' => 'decimal:2',
        'critical_threshold' => 'decimal:2',
        'alert_triggered' => 'boolean',
        'approved_at' => 'datetime',
        'alert_triggered_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Status Constants
    const STATUS_DRAFT = 'draft';
    const STATUS_ACTIVE = 'active';
    const STATUS_FROZEN = 'frozen';
    const STATUS_CLOSED = 'closed';
    const STATUS_ARCHIVED = 'archived';

    const STATUS_LABELS = [
        self::STATUS_DRAFT => 'Draft',
        self::STATUS_ACTIVE => 'Active',
        self::STATUS_FROZEN => 'Frozen',
        self::STATUS_CLOSED => 'Closed',
        self::STATUS_ARCHIVED => 'Archived',
    ];

    const STATUS_COLORS = [
        self::STATUS_DRAFT => 'secondary',
        self::STATUS_ACTIVE => 'success',
        self::STATUS_FROZEN => 'warning',
        self::STATUS_CLOSED => 'danger',
        self::STATUS_ARCHIVED => 'secondary',
    ];

    // Budget Types
    const TYPE_ANNUAL = 'annual';
    const TYPE_QUARTERLY = 'quarterly';
    const TYPE_MONTHLY = 'monthly';
    const TYPE_PROJECT = 'project';

    const TYPE_LABELS = [
        self::TYPE_ANNUAL => 'Annual Budget',
        self::TYPE_QUARTERLY => 'Quarterly Budget',
        self::TYPE_MONTHLY => 'Monthly Budget',
        self::TYPE_PROJECT => 'Project Budget',
    ];

    // ============================================
    // BOOT METHOD - Auto-calculate on save
    // ============================================

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->budget_code)) {
                $model->budget_code = NumberGenerator::generate(
                    'BUD',
                    self::class,
                    'yearly',
                    ['field' => 'budget_code']
                );
            }
            // Auto-calculate before creating
            // $model->recalculate();
        });

        // ✅ Auto-calculate before saving (updating)
        // static::saving(function ($model) {
        //     $model->recalculate();
        //     return true;
        // });

        static::saved(function ($model) {
            // Check alerts after save
            $model->checkAlerts();
        });
    }

    // ============================================
    // RELATIONSHIPS
    // ============================================

    public function category()
    {
        return $this->belongsTo(BudgetCategory::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function periods()
    {
        return $this->hasMany(BudgetPeriod::class, 'budget_code', 'budget_code');
    }

    public function transactions()
    {
        return $this->hasMany(BudgetTransaction::class, 'budget_code', 'budget_code');
    }

    // ============================================
    // SCOPES
    // ============================================

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeByDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeByYear($query, $year)
    {
        return $query->where('fiscal_year', $year);
    }

    public function scopeByCategory($query, $categoryId)
    {
        return $query->where('category_id', $categoryId);
    }

    public function scopeAvailable($query)
    {
        return $query->where('available_amount', '>', 0);
    }

    public function scopeAlertTriggered($query)
    {
        return $query->where('alert_triggered', true);
    }

    public function scopeCritical($query)
    {
        return $query->where('utilization_percentage', '>=', 90);
    }

    public function scopeWarning($query)
    {
        return $query->whereBetween('utilization_percentage', [75, 89]);
    }

    // ============================================
    // ACCESSORS
    // ============================================

    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? ucfirst($this->status);
    }

    public function getStatusColorAttribute(): string
    {
        return self::STATUS_COLORS[$this->status] ?? 'secondary';
    }

    public function getTypeLabelAttribute(): string
    {
        return self::TYPE_LABELS[$this->budget_type] ?? ucfirst($this->budget_type);
    }

    public function getUtilizationLevelAttribute(): string
    {
        $util = $this->utilization_percentage;
        if ($util >= $this->critical_threshold) return 'critical';
        if ($util >= $this->warning_threshold) return 'warning';
        if ($util >= 50) return 'moderate';
        return 'good';
    }

    public function getUtilizationColorAttribute(): string
    {
        return match ($this->utilization_level) {
            'critical' => 'danger',
            'warning' => 'warning',
            'moderate' => 'info',
            'good' => 'success',
        };
    }

    public function getIsDepletedAttribute(): bool
    {
        return $this->available_amount <= 0;
    }

    public function getIsOverBudgetAttribute(): bool
    {
        return $this->actual_spent > $this->allocated_amount;
    }

    public function getRemainingDaysAttribute(): ?int
    {
        $endOfYear = \Carbon\Carbon::create($this->fiscal_year, 12, 31);
        return now()->diffInDays($endOfYear, false);
    }

    public function getDailySpendRateAttribute(): float
    {
        $daysInYear = 365;
        $elapsedDays = 365 - ($this->remaining_days ?? 0);
        if ($elapsedDays <= 0) return 0;
        return $this->actual_spent / $elapsedDays;
    }

    public function getProjectedSpendAttribute(): float
    {
        $totalDays = 365;
        return $this->daily_spend_rate * $totalDays;
    }

    public function getVarianceAttribute(): float
    {
        return $this->allocated_amount - $this->projected_spend;
    }

    // ============================================
    // CORE RECALCULATION METHOD - THIS IS THE KEY! 
    // ============================================

    /**
     * Recalculate available amount and utilization percentage
     * This is automatically called before saving
     */
    // public function recalculate(): void
    // {
    //     $allocated = floatval($this->allocated_amount);
    //     $reserved = floatval($this->reserved_amount);
    //     $committed = floatval($this->committed_amount);
    //     $actual = floatval($this->actual_spent);

    //     // ✅ Calculate available amount: allocated - (reserved + committed + actual)
    //     $used = $reserved + $committed + $actual;
    //     $this->available_amount = max(0, $allocated - $used);

    //     // ✅ Calculate utilization percentage
    //     if ($allocated > 0) {
    //         $this->utilization_percentage = min(100, ($used / $allocated) * 100);
    //     } else {
    //         $this->utilization_percentage = 0;
    //     }

    //     // ✅ Log recalculation (for debugging)
    //     Log::debug('Budget recalculated', [
    //         'budget_code' => $this->budget_code,
    //         'allocated' => $allocated,
    //         'reserved' => $reserved,
    //         'committed' => $committed,
    //         'actual' => $actual,
    //         'used' => $used,
    //         'available' => $this->available_amount,
    //         'utilization' => $this->utilization_percentage
    //     ]);
    // }

    // ============================================
    // BUDGET OPERATION METHODS
    // ============================================

    /**
     * Check if the budget has sufficient funds
     */
    public function hasSufficientBudget(float $amount): bool
    {
        return $this->available_amount >= $amount;
    }

    /**
     * Reserve funds from the budget (checkBudget)
     * Available DECREASES
     */
    public function reserveBudget(float $amount, string $referenceType = null, int $referenceId = null): bool
    {
        Log::info('🔵 reserveBudget called', [
            'budget_code' => $this->budget_code,
            'amount' => $amount,
            'current_available' => $this->available_amount,
            'current_reserved' => $this->reserved_amount
        ]);

        if (!$this->hasSufficientBudget($amount)) {
            Log::warning('⚠️ Insufficient budget for reservation', [
                'budget_code' => $this->budget_code,
                'available' => $this->available_amount,
                'requested' => $amount
            ]);
            return false;
        }

        // Store the amount before reservation
        $balanceBefore = $this->available_amount;

        // ✅ Update reserved_amount - available will be auto-calculated
        $this->reserved_amount = floatval($this->reserved_amount) + $amount;
        $this->save(); // This triggers recalculate()

        Log::info('✅ Budget reserved successfully', [
            'budget_code' => $this->budget_code,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $this->available_amount,
            'new_reserved' => $this->reserved_amount
        ]);

        // Log the transaction
        BudgetTransaction::create([
            'transaction_no' => NumberGenerator::generate('BT', BudgetTransaction::class, 'daily'),
            'budget_code' => $this->budget_code,
            'transaction_type' => 'reservation',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $this->available_amount,
            'description' => "Budget reserved for {$referenceType} #{$referenceId}",
            'transaction_date' => now(),
            'created_by' => auth()->id() ?? 1,
        ]);

        return true;
    }

    /**
     * Commit funds from the budget (approveRequisition)
     * Available STAYS THE SAME (moves from reserved to committed)
     */
    public function commitBudget(float $amount, string $referenceType = null, int $referenceId = null): bool
    {
        Log::info('🔵 commitBudget called', [
            'budget_code' => $this->budget_code,
            'amount' => $amount,
            'current_reserved' => $this->reserved_amount,
            'current_committed' => $this->committed_amount
        ]);

        if ($this->reserved_amount < $amount) {
            Log::warning('⚠️ Insufficient reserved amount for commitment', [
                'budget_code' => $this->budget_code,
                'reserved' => $this->reserved_amount,
                'requested' => $amount
            ]);
            return false;
        }

        // Store the amount before commitment
        $balanceBefore = $this->available_amount;

        // ✅ Move from reserved to committed - available stays the same
        $this->reserved_amount = floatval($this->reserved_amount) - $amount;
        $this->committed_amount = floatval($this->committed_amount) + $amount;
        $this->save(); // This triggers recalculate()

        Log::info('✅ Budget committed successfully', [
            'budget_code' => $this->budget_code,
            'amount' => $amount,
            'new_reserved' => $this->reserved_amount,
            'new_committed' => $this->committed_amount,
            'available' => $this->available_amount
        ]);

        // Log the transaction
        BudgetTransaction::create([
            'transaction_no' => NumberGenerator::generate('BT', BudgetTransaction::class, 'daily'),
            'budget_code' => $this->budget_code,
            'transaction_type' => 'commitment',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $this->available_amount,
            'description' => "Budget committed for {$referenceType} #{$referenceId}",
            'transaction_date' => now(),
            'created_by' => auth()->id() ?? 1,
            'approved_by' => auth()->id() ?? 1,
            'approved_at' => now(),
        ]);

        return true;
    }

    /**
     * Release/Actualize funds (releaseFunds)
     * Available DECREASES (funds are actually spent)
     */
    public function actualizeBudget(float $amount, string $referenceType = null, int $referenceId = null): bool
    {
        Log::info('🔵 actualizeBudget called', [
            'budget_code' => $this->budget_code,
            'amount' => $amount,
            'current_available' => $this->available_amount,
            'current_committed' => $this->committed_amount,
            'current_actual' => $this->actual_spent
        ]);

        if ($this->committed_amount < $amount) {
            Log::warning('⚠️ Insufficient committed amount for actualization', [
                'budget_code' => $this->budget_code,
                'committed' => $this->committed_amount,
                'requested' => $amount
            ]);
            return false;
        }

        // Store the amount before actualization
        $balanceBefore = $this->available_amount;

        // ✅ Move from committed to actual spent - available DECREASES
        $this->committed_amount = floatval($this->committed_amount) - $amount;
        $this->actual_spent = floatval($this->actual_spent) + $amount;
        $this->save(); // This triggers recalculate()

        Log::info('✅ Funds released successfully', [
            'budget_code' => $this->budget_code,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $this->available_amount,
            'new_actual_spent' => $this->actual_spent,
            'new_committed' => $this->committed_amount
        ]);

        // Log the transaction
        BudgetTransaction::create([
            'transaction_no' => NumberGenerator::generate('BT', BudgetTransaction::class, 'daily'),
            'budget_code' => $this->budget_code,
            'transaction_type' => 'actual',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $this->available_amount,
            'description' => "Funds released for {$referenceType} #{$referenceId}",
            'transaction_date' => now(),
            'created_by' => auth()->id() ?? 1,
            'approved_by' => auth()->id() ?? 1,
            'approved_at' => now(),
        ]);

        return true;
    }

    /**
     * Release reserved funds (when requisition is rejected)
     * Available INCREASES (funds are returned)
     */
    public function releaseReservedFunds(float $amount, string $referenceType = null, int $referenceId = null): bool
    {
        Log::info('🔵 releaseReservedFunds called', [
            'budget_code' => $this->budget_code,
            'amount' => $amount,
            'current_reserved' => $this->reserved_amount,
            'current_available' => $this->available_amount
        ]);

        if ($this->reserved_amount < $amount) {
            Log::warning('⚠️ Insufficient reserved amount for release', [
                'budget_code' => $this->budget_code,
                'reserved' => $this->reserved_amount,
                'requested' => $amount
            ]);
            return false;
        }

        // Store the amount before release
        $balanceBefore = $this->available_amount;

        // ✅ Release reserved funds - Available INCREASES
        $this->reserved_amount = floatval($this->reserved_amount) - $amount;
        $this->save(); // This triggers recalculate()

        Log::info('✅ Reserved funds released successfully', [
            'budget_code' => $this->budget_code,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $this->available_amount,
            'new_reserved' => $this->reserved_amount
        ]);

        // Log the transaction
        BudgetTransaction::create([
            'transaction_no' => NumberGenerator::generate('BT', BudgetTransaction::class, 'daily'),
            'budget_code' => $this->budget_code,
            'transaction_type' => 'reversal',
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'amount' => -$amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $this->available_amount,
            'description' => "Reserved funds released for {$referenceType} #{$referenceId}",
            'transaction_date' => now(),
            'created_by' => auth()->id() ?? 1,
        ]);

        return true;
    }

    // ============================================
    // ALERT METHODS
    // ============================================

    /**
     * Check alerts for budget utilization
     */
    public function checkAlerts(): void
    {
        $utilization = $this->utilization_percentage;
        $alertTriggered = false;
        $message = null;

        if ($utilization >= $this->critical_threshold) {
            $alertTriggered = true;
            $message = "CRITICAL: Budget utilization at {$utilization}%. Threshold: {$this->critical_threshold}%";
            $this->createAlert('critical', $utilization, $message);
        } elseif ($utilization >= $this->warning_threshold) {
            $alertTriggered = true;
            $message = "WARNING: Budget utilization at {$utilization}%. Threshold: {$this->warning_threshold}%";
            $this->createAlert('warning', $utilization, $message);
        }

        if ($alertTriggered) {
            $this->update([
                'alert_triggered' => true,
                'alert_message' => $message,
                'alert_triggered_at' => now(),
            ]);
        }
    }

    /**
     * Create a budget alert
     */
    private function createAlert(string $type, float $utilization, string $message): void
    {
        BudgetAlert::create([
            'budget_code' => $this->budget_code,
            'alert_type' => $type,
            'threshold' => $type === 'critical' ? $this->critical_threshold : $this->warning_threshold,
            'current_utilization' => $utilization,
            'message' => $message,
            'recommendation' => $this->getRecommendation($type),
        ]);
    }

    /**
     * Get recommendation based on alert type
     */
    private function getRecommendation(string $type): string
    {
        return match ($type) {
            'critical' => 'Immediate action required. Consider budget reallocation or freeze non-critical spending.',
            'warning' => 'Review spending patterns. Consider cost-saving measures or request additional budget.',
            default => 'Monitor spending closely.',
        };
    }

    // ============================================
    // STATUS METHODS
    // ============================================

    /**
     * Approve the budget
     */
    public function approve(): void
    {
        if ($this->status !== self::STATUS_DRAFT) {
            throw new \Exception('Only draft budgets can be approved');
        }

        $this->update([
            'status' => self::STATUS_ACTIVE,
            'approved_at' => now(),
        ]);
    }

    /**
     * Freeze the budget
     */
    public function freeze(): void
    {
        if (!in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_DRAFT])) {
            throw new \Exception('Only active or draft budgets can be frozen');
        }

        $this->update(['status' => self::STATUS_FROZEN]);
    }

    // ============================================
    // SUMMARY METHODS
    // ============================================

    /**
     * Get budget summary
     */
    public function getSummary(): array
    {
        return [
            'budget_code' => $this->budget_code,
            'budget_name' => $this->budget_name,
            'department' => $this->department->name ?? 'N/A',
            'category' => $this->category->name ?? 'N/A',
            'fiscal_year' => $this->fiscal_year,
            'allocated_amount' => $this->allocated_amount,
            'reserved_amount' => $this->reserved_amount,
            'committed_amount' => $this->committed_amount,
            'actual_spent' => $this->actual_spent,
            'available_amount' => $this->available_amount,
            'utilization_percentage' => $this->utilization_percentage,
            'utilization_level' => $this->utilization_level,
            'status' => $this->status_label,
            'status_color' => $this->status_color,
        ];
    }

    /**
     * Force recalculation for all budget allocations
     */
    public static function recalculateAll(): void
    {
        // $budgets = self::all();
        // foreach ($budgets as $budget) {
        //     $budget->recalculate();
        //     $budget->saveQuietly(); // Save without triggering events
        // }

        // Log::info('All budgets recalculated', ['count' => $budgets->count()]);
    }
}
