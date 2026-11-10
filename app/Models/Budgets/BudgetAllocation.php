<?php

namespace App\Models\Budgets;

use App\Helpers\NumberGenerator;
use App\Models\Departments\Department;
use App\Models\Suppliers\Supplier;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Notifications\BudgetThresholdNotification;
use Illuminate\Support\Facades\Notification;

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
        'original_amount'        => 'decimal:2',
        'revised_amount'         => 'decimal:2',
        'allocated_amount'       => 'decimal:2',
        'reserved_amount'        => 'decimal:2',
        'committed_amount'       => 'decimal:2',
        'actual_spent'           => 'decimal:2',
        'available_amount'       => 'decimal:2',
        'utilization_percentage' => 'decimal:2',
        'warning_threshold'      => 'decimal:2',
        'critical_threshold'     => 'decimal:2',
        'alert_triggered'        => 'boolean',
        'approved_at'            => 'datetime',
        'alert_triggered_at'     => 'datetime',
        'created_at'             => 'datetime',
        'updated_at'             => 'datetime',
        'deleted_at'             => 'datetime',
    ];

    // Computed attributes included automatically in toArray()/JSON/Inertia props
    protected $appends = [
        'uncommitted_amount',
    ];

    // Status Constants
    const STATUS_DRAFT    = 'draft';
    const STATUS_ACTIVE   = 'active';
    const STATUS_FROZEN   = 'frozen';
    const STATUS_CLOSED   = 'closed';
    const STATUS_ARCHIVED = 'archived';

    const STATUS_LABELS = [
        self::STATUS_DRAFT    => 'Draft',
        self::STATUS_ACTIVE   => 'Active',
        self::STATUS_FROZEN   => 'Frozen',
        self::STATUS_CLOSED   => 'Closed',
        self::STATUS_ARCHIVED => 'Archived',
    ];

    const STATUS_COLORS = [
        self::STATUS_DRAFT    => 'secondary',
        self::STATUS_ACTIVE   => 'success',
        self::STATUS_FROZEN   => 'warning',
        self::STATUS_CLOSED   => 'danger',
        self::STATUS_ARCHIVED => 'secondary',
    ];

    // Budget Types
    const TYPE_ANNUAL    = 'annual';
    const TYPE_QUARTERLY = 'quarterly';
    const TYPE_MONTHLY   = 'monthly';
    const TYPE_PROJECT   = 'project';

    const TYPE_LABELS = [
        self::TYPE_ANNUAL    => 'Annual Budget',
        self::TYPE_QUARTERLY => 'Quarterly Budget',
        self::TYPE_MONTHLY   => 'Monthly Budget',
        self::TYPE_PROJECT   => 'Project Budget',
    ];

    // ============================================
    // BOOT METHOD - Auto-calculate on save
    // ============================================

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->budget_code)) {
                $model->budget_code = NumberGenerator::generate(
                    'BUD',
                    self::class,
                    'yearly',
                    ['field' => 'budget_code']
                );
            }

            // If no allocated amount was supplied, fall back to revised/original
            if ((float) $model->allocated_amount <= 0) {
                $model->allocated_amount = $model->revised_amount ?? $model->original_amount ?? 0;
            }
        });

        // Recalculate available_amount and utilization_percentage on EVERY save
        // (create and update). This was the missing piece.
        static::saving(function (self $model) {
            $model->recalculate();
        });

        static::saved(function (self $model) {
            // Only check alerts when money figures actually moved
            if ($model->wasRecentlyCreated || $model->wasChanged([
                'allocated_amount',
                'reserved_amount',
                'committed_amount',
                'actual_spent',
            ])) {
                $model->checkAlerts();
            }
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
        return $query->whereBetween('utilization_percentage', [75, 89.99]);
    }

    // ============================================
    // ACCESSORS
    // ============================================

    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? ucfirst((string) $this->status);
    }

    public function getStatusColorAttribute(): string
    {
        return self::STATUS_COLORS[$this->status] ?? 'secondary';
    }

    public function getTypeLabelAttribute(): string
    {
        return self::TYPE_LABELS[$this->budget_type] ?? ucfirst((string) $this->budget_type);
    }

    public function getUtilizationLevelAttribute(): string
    {
        $util = (float) $this->utilization_percentage;

        if ($util >= (float) $this->critical_threshold) return 'critical';
        if ($util >= (float) $this->warning_threshold) return 'warning';
        if ($util >= 50) return 'moderate';

        return 'good';
    }

    public function getUtilizationColorAttribute(): string
    {
        return match ($this->utilization_level) {
            'critical' => 'danger',
            'warning'  => 'warning',
            'moderate' => 'info',
            default    => 'success',
        };
    }

    public function getIsDepletedAttribute(): bool
    {
        return (float) $this->available_amount <= 0;
    }

    public function getIsOverBudgetAttribute(): bool
    {
        return (float) $this->actual_spent > (float) $this->allocated_amount;
    }

    public function getRemainingDaysAttribute(): ?int
    {
        $endOfYear = Carbon::create((int) $this->fiscal_year, 12, 31);

        return (int) now()->diffInDays($endOfYear, false);
    }

    public function getDailySpendRateAttribute(): float
    {
        $elapsedDays = 365 - ($this->remaining_days ?? 0);

        if ($elapsedDays <= 0) return 0.0;

        return (float) $this->actual_spent / $elapsedDays;
    }

    public function getProjectedSpendAttribute(): float
    {
        return $this->daily_spend_rate * 365;
    }

    public function getVarianceAttribute(): float
    {
        return (float) $this->allocated_amount - $this->projected_spend;
    }

    /**
     * Uncommitted amount = allocated - (reserved + committed + actual_spent).
     * This is the money still free to be promised to NEW requisitions.
     * Drops on reserve, rises when reserved funds are released back.
     * Used by hasSufficientBudget().
     */
    public function getUncommittedAmountAttribute(): float
    {
        return round(
            (float) $this->allocated_amount
                - (float) $this->reserved_amount
                - (float) $this->committed_amount
                - (float) $this->actual_spent,
            2
        );
    }

    // ============================================
    // CORE RECALCULATION METHOD
    // ============================================

    /**
     * Recalculate available amount and utilization percentage.
     * Called automatically from the `saving` hook.
     *
     * available   = allocated - actual_spent   (cash view: DROPS when funds are released)
     * utilization = (reserved + committed + actual_spent) / allocated * 100
     *
     * The "free to promise" figure is the uncommitted_amount accessor.
     */
    public function recalculate(): void
    {
        $allocated = (float) $this->allocated_amount;
        $reserved  = (float) $this->reserved_amount;
        $committed = (float) $this->committed_amount;
        $actual    = (float) $this->actual_spent;

        $used = $reserved + $committed + $actual;

        $this->available_amount = round(max(0, $allocated - $actual), 2);

        $this->utilization_percentage = $allocated > 0
            ? round(min(100, ($used / $allocated) * 100), 2)
            : 0;
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    /**
     * Run a callback against a row-locked fresh copy of this budget inside a
     * DB transaction (prevents two simultaneous requests overwriting each other),
     * then sync the result back onto $this so callers see the new values.
     */
    private function withLock(callable $callback): bool
    {
        return DB::transaction(function () use ($callback) {
            /** @var self $locked */
            $locked = static::query()->lockForUpdate()->findOrFail($this->getKey());

            $result = $callback($locked);

            // Push the fresh values back onto this instance
            $this->setRawAttributes($locked->getAttributes(), true);

            return (bool) $result;
        });
    }

    /**
     * Write a row to budget_transactions.
     */
    private function logTransaction(
        string $type,
        float $amount,
        float $balanceBefore,
        string $description,
        ?string $referenceType,
        ?int $referenceId,
        bool $approved = false
    ): void {
        $data = [
            'transaction_no'   => NumberGenerator::generate('BT', BudgetTransaction::class, 'daily') . rand(0000, 9999),
            'budget_code'      => $this->budget_code,
            'transaction_type' => $type,
            'reference_type'   => $referenceType,
            'reference_id'     => $referenceId,
            'amount'           => $amount,
            'balance_before'   => $balanceBefore,
            // 'actual' (release) tracks the cash balance; the others track the uncommitted balance
            'balance_after'    => $type === 'actual'
                ? (float) $this->available_amount
                : (float) $this->uncommitted_amount,
            'description'      => $description,
            'transaction_date' => now(),
            'created_by'       => auth()->id() ?? 1,
        ];

        if ($approved) {
            $data['approved_by'] = auth()->id() ?? 1;
            $data['approved_at'] = now();
        }

        BudgetTransaction::create($data);
    }

    // ============================================
    // BUDGET OPERATION METHODS
    // ============================================

    /**
     * Check if the budget has sufficient funds
     */
    public function hasSufficientBudget(float $amount): bool
    {
        return $this->uncommitted_amount >= round($amount, 2);
    }

    /**
     * Reserve funds (when a requisition is submitted)
     * reserved +amount  => uncommitted_amount DECREASES (available_amount unchanged)
     */
    public function reserveBudget(float $amount, ?string $referenceType = null, ?int $referenceId = null): bool
    {
        return $this->withLock(function (self $b) use ($amount, $referenceType, $referenceId) {
            Log::info('reserveBudget called', [
                'budget_code'       => $b->budget_code,
                'amount'            => $amount,
                'current_available' => $b->available_amount,
                'current_reserved'  => $b->reserved_amount,
            ]);

            if (!$b->hasSufficientBudget($amount)) {
                Log::warning('Insufficient budget for reservation', [
                    'budget_code' => $b->budget_code,
                    'available'   => $b->available_amount,
                    'requested'   => $amount,
                ]);
                return false;
            }

            $balanceBefore = (float) $b->uncommitted_amount;

            $b->reserved_amount = round((float) $b->reserved_amount + $amount, 2);
            $b->save(); // `saving` hook recalculates available + utilization

            $b->logTransaction(
                'reservation',
                $amount,
                $balanceBefore,
                "Budget reserved for {$referenceType} #{$referenceId}",
                $referenceType,
                $referenceId
            );

            Log::info('Budget reserved successfully', [
                'budget_code'    => $b->budget_code,
                'balance_before' => $balanceBefore,
                'balance_after'  => $b->available_amount,
                'new_reserved'   => $b->reserved_amount,
            ]);

            return true;
        });
    }

    /**
     * Commit funds (when a requisition is approved)
     * reserved -amount, committed +amount => uncommitted and available UNCHANGED
     */
    public function commitBudget(float $amount, ?string $referenceType = null, ?int $referenceId = null): bool
    {
        return $this->withLock(function (self $b) use ($amount, $referenceType, $referenceId) {
            Log::info('commitBudget called', [
                'budget_code'       => $b->budget_code,
                'amount'            => $amount,
                'current_reserved'  => $b->reserved_amount,
                'current_committed' => $b->committed_amount,
            ]);

            if (round((float) $b->reserved_amount, 2) < round($amount, 2)) {
                Log::warning('Insufficient reserved amount for commitment', [
                    'budget_code' => $b->budget_code,
                    'reserved'    => $b->reserved_amount,
                    'requested'   => $amount,
                ]);
                return false;
            }

            $balanceBefore = (float) $b->uncommitted_amount;

            $b->reserved_amount  = round((float) $b->reserved_amount - $amount, 2);
            $b->committed_amount = round((float) $b->committed_amount + $amount, 2);
            $b->save();

            $b->logTransaction(
                'commitment',
                $amount,
                $balanceBefore,
                "Budget committed for {$referenceType} #{$referenceId}",
                $referenceType,
                $referenceId,
                true
            );

            Log::info('Budget committed successfully', [
                'budget_code'   => $b->budget_code,
                'new_reserved'  => $b->reserved_amount,
                'new_committed' => $b->committed_amount,
                'available'     => $b->available_amount,
            ]);

            return true;
        });
    }

    /**
     * Release/Actualize funds (when funds are actually released/spent)
     * committed -amount, actual_spent +amount => available_amount DECREASES
     * (uncommitted_amount unchanged: it was already deducted at reservation time)
     */
    public function actualizeBudget(float $amount, ?string $referenceType = null, ?int $referenceId = null): bool
    {
        return $this->withLock(function (self $b) use ($amount, $referenceType, $referenceId) {
            Log::info('actualizeBudget called', [
                'budget_code'       => $b->budget_code,
                'amount'            => $amount,
                'current_available' => $b->available_amount - $amount,
                'current_committed' => $b->committed_amount,
                'current_actual'    => $b->actual_spent,
            ]);


            if (round((float) $b->committed_amount, 2) < round($amount, 2)) {
                Log::warning('Insufficient committed amount for actualization', [
                    'budget_code' => $b->budget_code,
                    'committed'   => $b->committed_amount,
                    'requested'   => $amount,
                ]);
                return false;
            }

            $balanceBefore = (float) $b->available_amount;

            $b->committed_amount = round((float) $b->committed_amount - $amount, 2);
            $b->actual_spent     = round((float) $b->actual_spent + $amount, 2);
            $b->save();

            $b->logTransaction(
                'actual',
                $amount,
                $balanceBefore,
                "Funds released for {$referenceType} #{$referenceId}",
                $referenceType,
                $referenceId,
                true
            );


            // Check if there are sufficient available funds

            $budget = BudgetAllocation::where('budget_code', $b->budget_code)->first();

            $budget->update([
                'budget_code'       => $b->budget_code,
                'amount'            => $amount,
                'current_available' => $b->available_amount - $amount,
                'current_committed' => $b->committed_amount,
                'current_actual'    => $b->actual_spent,
            ]);

            Log::info('Funds released successfully', [
                'budget_code'      => $b->budget_code,
                'balance_before'   => $balanceBefore,
                'balance_after'    => $b->available_amount,
                'new_actual_spent' => $b->actual_spent,
                'new_committed'    => $b->committed_amount,
            ]);

            return true;
        });
    }

    /**
     * Release reserved funds (when a requisition is rejected/cancelled)
     * reserved -amount => uncommitted_amount INCREASES (available_amount unchanged)
     */
    public function releaseReservedFunds(float $amount, ?string $referenceType = null, ?int $referenceId = null): bool
    {
        return $this->withLock(function (self $b) use ($amount, $referenceType, $referenceId) {
            Log::info('releaseReservedFunds called', [
                'budget_code'       => $b->budget_code,
                'amount'            => $amount,
                'current_reserved'  => $b->reserved_amount,
                'current_available' => $b->available_amount,
            ]);

            if (round((float) $b->reserved_amount, 2) < round($amount, 2)) {
                Log::warning('Insufficient reserved amount for release', [
                    'budget_code' => $b->budget_code,
                    'reserved'    => $b->reserved_amount,
                    'requested'   => $amount,
                ]);
                return false;
            }

            $balanceBefore = (float) $b->uncommitted_amount;

            $b->reserved_amount = round((float) $b->reserved_amount - $amount, 2);
            $b->save();

            $b->logTransaction(
                'reversal',
                -$amount,
                $balanceBefore,
                "Reserved funds released for {$referenceType} #{$referenceId}",
                $referenceType,
                $referenceId
            );

            Log::info('Reserved funds released successfully', [
                'budget_code'    => $b->budget_code,
                'balance_before' => $balanceBefore,
                'balance_after'  => $b->available_amount,
                'new_reserved'   => $b->reserved_amount,
            ]);

            return true;
        });
    }

    // ============================================
    // ALERT METHODS
    // ============================================

    /**
     * Check alerts for budget utilization.
     * - Creates a BudgetAlert only when the alert LEVEL changes (no duplicates on every save)
     * - Clears the alert flags when utilization drops back below the warning threshold
     * - Uses saveQuietly() so it never re-triggers the `saved` hook (no recursion)
     */
    public function checkAlerts(): void
    {
        $utilization = (float) $this->utilization_percentage;

        if ($utilization >= (float) $this->critical_threshold) {
            $type    = 'critical';
            $message = "CRITICAL: Budget utilization at {$utilization}%. Threshold: {$this->critical_threshold}%";
        } elseif ($utilization >= (float) $this->warning_threshold) {
            $type    = 'warning';
            $message = "WARNING: Budget utilization at {$utilization}%. Threshold: {$this->warning_threshold}%";
        } else {
            // Back to a healthy level: reset flags if they were set
            if ($this->alert_triggered) {
                $this->forceFill([
                    'alert_triggered'    => false,
                    'alert_message'      => null,
                    'alert_triggered_at' => null,
                ])->saveQuietly();
            }
            return;
        }

        // Same level already alerted? Don't create another alert row.
        $previousType = $this->alert_triggered
            ? (str_starts_with((string) $this->alert_message, 'CRITICAL') ? 'critical' : 'warning')
            : null;

        if ($previousType === $type) {
            return;
        }

        $this->createAlert($type, $utilization, $message);

        $this->forceFill([
            'alert_triggered'    => true,
            'alert_message'      => $message,
            'alert_triggered_at' => now(),
        ])->saveQuietly();
    }

    /**
     * Create a budget alert
     */
    private function createAlert(string $type, float $utilization, string $message): void
    {
        $threshold = $type === 'critical' ? $this->critical_threshold : $this->warning_threshold;

        BudgetAlert::create([
            'budget_code'         => $this->budget_code,
            'alert_type'          => $type,
            'threshold'           => $threshold,
            'current_utilization' => $utilization,
            'message'             => $message,
            'recommendation'      => $this->getRecommendation($type),
        ]);

        $this->notifyAdmins($type, $utilization, (float) $threshold);
    }

    private function notifyAdmins(string $type, float $utilization, float $threshold): void
    {
        try {
            $admins = User::where('is_admin', true)->get();

            if ($admins->isEmpty()) {
                return;
            }

            Notification::send($admins, new BudgetThresholdNotification(
                budgetId: $this->id,
                budgetCode: $this->budget_code,
                budgetName: $this->budget_name,
                level: $type,
                utilization: $utilization,
                threshold: $threshold,
                allocatedAmount: (float) $this->allocated_amount,
                availableAmount: (float) $this->available_amount,
                uncommittedAmount: (float) $this->uncommitted_amount,
            ));
        } catch (\Throwable $e) {
            // A notification problem must never break a budget transaction
            Log::error('Budget threshold notification failed: ' . $e->getMessage(), [
                'budget_code' => $this->budget_code,
            ]);
        }
    }
    /**
     * Get recommendation based on alert type
     */
    private function getRecommendation(string $type): string
    {
        return match ($type) {
            'critical' => 'Immediate action required. Consider budget reallocation or freeze non-critical spending.',
            'warning'  => 'Review spending patterns. Consider cost-saving measures or request additional budget.',
            default    => 'Monitor spending closely.',
        };
    }


    // ============================================
    // STATUS METHODS
    // ============================================

    /**
     * Available = allocated - reserved - committed - actual_spent.
     */
    public function available(): float
    {
        return round(
            (float) $this->allocated_amount
                - (float) $this->reserved_amount
                - (float) $this->committed_amount
                - (float) $this->actual_spent,
            2
        );
    }

    /**
     * Can this budget cover $amount with its currently available balance?
     */
    public function canCover(float $amount): bool
    {
        return $this->available() >= $amount;
    }

    /**
     * Utilization percentage of allocated_amount (0–100).
     */
    public function utilization(): float
    {
        $allocated = (float) $this->allocated_amount;

        if ($allocated <= 0.0) {
            return 0.0;
        }

        $used = (float) $this->reserved_amount
            + (float) $this->committed_amount
            + (float) $this->actual_spent;

        return round(($used / $allocated) * 100, 2);
    }

    /**
     * Approve the budget
     */
    public function approve(): void
    {
        if ($this->status !== self::STATUS_DRAFT) {
            throw new \Exception('Only draft budgets can be approved');
        }

        $this->update([
            'status'      => self::STATUS_ACTIVE,
            'approved_by' => auth()->id() ?? $this->approved_by,
            'approved_at' => now(),
        ]);
    }

    /**
     * Freeze the budget
     */
    public function freeze(): void
    {
        if (!in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_DRAFT], true)) {
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
            'budget_code'            => $this->budget_code,
            'budget_name'            => $this->budget_name,
            'department'             => $this->department->name ?? 'N/A',
            'category'               => $this->category->name ?? 'N/A',
            'fiscal_year'            => $this->fiscal_year,
            'allocated_amount'       => $this->allocated_amount,
            'reserved_amount'        => $this->reserved_amount,
            'committed_amount'       => $this->committed_amount,
            'actual_spent'           => $this->actual_spent,
            'available_amount'       => $this->available_amount,
            'utilization_percentage' => $this->utilization_percentage,
            'utilization_level'      => $this->utilization_level,
            'status'                 => $this->status_label,
            'status_color'           => $this->status_color,
        ];
    }

    /**
     * Force recalculation for all budget allocations (run once to backfill old rows).
     * Uses saveQuietly() so no events/alerts fire during the backfill.
     */
    public static function recalculateAll(): void
    {
        $count = 0;

        self::query()->chunkById(200, function ($budgets) use (&$count) {
            foreach ($budgets as $budget) {
                $budget->recalculate();
                $budget->saveQuietly();
                $count++;
            }
        });

        Log::info('All budgets recalculated', ['count' => $count]);
    }
}
