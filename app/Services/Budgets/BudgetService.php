<?php
// app/Services/Budgets/BudgetService.php

namespace App\Services\Budgets;

use App\Models\Budgets\BudgetAllocation;
use App\Repositories\Budgets\BudgetRepository;
use App\Repositories\Budgets\BudgetTransactionRepository;
use App\Services\Budgets\Exceptions\InsufficientBudget;
use Illuminate\Support\Facades\Log;

class BudgetService
{
    public function __construct(
        protected BudgetRepository $budgets,
        protected BudgetTransactionRepository $transactions,
    ) {}

    public function checkAvailability(
        string $budgetCode,
        float $amount,
        ?int $departmentId = null
    ): BudgetResult {
        $budget = $this->budgets->findByCode($budgetCode, $departmentId);

        if (!$budget) {
            return BudgetResult::fail('Budget code not found', ['budget_code' => $budgetCode]);
        }

        $available = $budget->available();
        $sufficient = $budget->canCover($amount);

        return BudgetResult::ok(
            $sufficient ? 'Budget is sufficient' : 'Budget is insufficient',
            $budget,
            [
                'amount' => $amount,
                'is_sufficient' => $sufficient,
                'available' => $available,
                'shortfall' => $sufficient ? 0.0 : round($amount - $available, 2),
                'remaining_after' => $sufficient ? round($available - $amount, 2) : 0.0,
                'utilization' => $budget->utilization(),
            ]
        );
    }

    public function reserve(
        string $budgetCode,
        float $amount,
        string $referenceType,
        int $referenceId,
        ?int $departmentId = null
    ): BudgetResult {
        return $this->execute(
            'reservation',
            $budgetCode,
            $amount,
            $referenceType,
            $referenceId,
            $departmentId,
            function (BudgetAllocation $b) use ($amount) {
                if (!$b->canCover($amount)) {
                    throw new InsufficientBudget('budget', $amount, $b->available());
                }
                $b->reserved_amount = round((float) $b->reserved_amount + $amount, 2);
            }
        );
    }

    public function commit(
        string $budgetCode,
        float $amount,
        string $referenceType,
        int $referenceId,
        ?int $departmentId = null
    ): BudgetResult {
        return $this->execute(
            'commitment',
            $budgetCode,
            $amount,
            $referenceType,
            $referenceId,
            $departmentId,
            function (BudgetAllocation $b) use ($amount) {
                if ((float) $b->reserved_amount < $amount) {
                    throw new InsufficientBudget('reserved', $amount, (float) $b->reserved_amount);
                }
                $b->reserved_amount  = round((float) $b->reserved_amount - $amount, 2);
                $b->committed_amount = round((float) $b->committed_amount + $amount, 2);
            }
        );
    }

    public function actualize(
        string $budgetCode,
        float $amount,
        string $referenceType,
        int $referenceId,
        ?int $departmentId = null
    ): BudgetResult {
        return $this->execute(
            'actual',
            $budgetCode,
            $amount,
            $referenceType,
            $referenceId,
            $departmentId,
            function (BudgetAllocation $b) use ($amount) {
                if ((float) $b->committed_amount < $amount) {
                    throw new InsufficientBudget('committed', $amount, (float) $b->committed_amount);
                }
                $b->committed_amount = round((float) $b->committed_amount - $amount, 2);
                $b->actual_spent     = round((float) $b->actual_spent + $amount, 2);
            }
        );
    }

    /**
     * Release from an explicit bucket. No silent guessing.
     *
     * @param 'reserved'|'committed' $bucket
     */
    public function release(
        string $budgetCode,
        float $amount,
        string $bucket,
        string $referenceType,
        int $referenceId,
        ?string $reason = null,
        ?int $departmentId = null
    ): BudgetResult {
        if (!in_array($bucket, ['reserved', 'committed'], true)) {
            return BudgetResult::fail("Invalid release bucket '{$bucket}'", ['bucket' => $bucket]);
        }

        return $this->execute(
            'reversal',
            $budgetCode,
            $amount,
            $referenceType,
            $referenceId,
            $departmentId,
            function (BudgetAllocation $b) use ($amount, $bucket) {
                $column = $bucket . '_amount';
                $current = (float) $b->{$column};
                if ($current < $amount) {
                    throw new InsufficientBudget($bucket, $amount, $current);
                }
                $b->{$column} = round($current - $amount, 2);
            },
            $reason
        );
    }

    public function getDepartmentSummary(int $departmentId, ?int $year = null): array
    {
        $year = $year ?? now()->year;
        $budgets = $this->budgets->getDepartmentBudgets($departmentId, $year);

        $allocated = round((float) $budgets->sum('allocated_amount'), 2);
        $reserved  = round((float) $budgets->sum('reserved_amount'), 2);
        $committed = round((float) $budgets->sum('committed_amount'), 2);
        $actual    = round((float) $budgets->sum('actual_spent'), 2);
        $used      = round($reserved + $committed + $actual, 2);

        return [
            'department_id' => $departmentId,
            'fiscal_year' => $year,
            'summary' => [
                'total_allocated' => $allocated,
                'total_reserved'  => $reserved,
                'total_committed' => $committed,
                'total_actual'    => $actual,
                'total_available' => round($allocated - $used, 2),
                'overall_utilization' => $allocated > 0 ? round(($used / $allocated) * 100, 2) : 0.0,
            ],
            'budgets' => $budgets->map(fn(BudgetAllocation $b) => [
                'id' => $b->id,
                'code' => $b->budget_code,
                'name' => $b->budget_name,
                'category' => $b->category?->name ?? 'N/A',
                'allocated' => (float) $b->allocated_amount,
                'reserved' => (float) $b->reserved_amount,
                'committed' => (float) $b->committed_amount,
                'actual_spent' => (float) $b->actual_spent,
                'available' => $b->available(),
                'utilization' => $b->utilization(),
                'status' => $b->status,
                'alert_triggered' => (bool) $b->alert_triggered,
            ])->all(),
        ];
    }

    public function getActiveBudgets(array $filters = []): array
    {
        return [
            'data' => $this->budgets->getActiveBudgets($filters)
                ->map(fn(BudgetAllocation $b) => [
                    'id' => $b->id,
                    'budget_code' => $b->budget_code,
                    'budget_name' => $b->budget_name,
                    'category' => $b->category?->name ?? 'N/A',
                    'department' => $b->department?->name ?? 'N/A',
                    'allocated' => (float) $b->allocated_amount,
                    'available' => $b->available(),
                    'utilization' => $b->utilization(),
                    'status' => $b->status,
                ])->all(),
        ];
    }

    public function getAllActiveBudgets()
    {
        return $this->budgets->getAllActiveBudgets();
    }

    // ------------------------------------------------------------------

    /** One transaction. One mutation. One audit row. */
    private function execute(
        string $transactionType,
        string $budgetCode,
        float $amount,
        string $referenceType,
        int $referenceId,
        ?int $departmentId,
        callable $mutation,
        ?string $reason = null
    ): BudgetResult {
        try {
            $budget = $this->budgets->mutate($budgetCode, $departmentId, $mutation);

            if (!$budget) {
                return BudgetResult::fail('Budget not found', ['budget_code' => $budgetCode]);
            }

            $this->transactions->create([
                'budget_code'      => $budgetCode,
                'transaction_type' => $transactionType,
                'reference_type'   => $referenceType,
                'reference_id'     => $referenceId,
                'amount'           => $amount,
                'description'      => "{$transactionType} for {$referenceType} #{$referenceId}"
                    . ($reason ? " ({$reason})" : ''),
                'transaction_date' => now(),
            ]);

            return BudgetResult::ok(
                "Budget {$transactionType} succeeded",
                $budget,
                ['amount' => $amount]
            );
        } catch (InsufficientBudget $e) {
            return BudgetResult::fail($e->getMessage(), [
                'bucket'    => $e->bucket,
                'required'  => $e->required,
                'available' => $e->available,
                'shortfall' => $e->shortfall(),
            ]);
        } catch (\Throwable $e) {
            Log::error("Budget {$transactionType} failed", [
                'budget_code' => $budgetCode,
                'amount' => $amount,
                'reference' => "{$referenceType}#{$referenceId}",
                'exception' => $e,
            ]);
            return BudgetResult::fail("Failed to {$transactionType} budget");
        }
    }
}
