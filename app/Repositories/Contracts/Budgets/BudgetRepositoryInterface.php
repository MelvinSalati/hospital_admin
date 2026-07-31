<?php

namespace App\Repositories\Contracts\Budgets;

use App\Models\Budgets\BudgetAllocation;
use Illuminate\Database\Eloquent\Collection;

interface BudgetRepositoryInterface
{
    /**
     * Find budget by code
     */
    public function findByCode(string $budgetCode, ?int $departmentId = null): ?BudgetAllocation;

    /**
     * Get active budgets with filters
     */
    public function getActiveBudgets(array $filters = []): Collection;

    /**
     * Get department budgets
     */
    public function getDepartmentBudgets(int $departmentId, ?int $year = null): Collection;

    /**
     * Update budget amounts
     */
    public function updateAmounts(BudgetAllocation $budget, array $data): BudgetAllocation;

    /**
     * Reserve budget
     */
    public function reserveBudget(BudgetAllocation $budget, float $amount): BudgetAllocation;

    /**
     * Commit budget
     */
    public function commitBudget(BudgetAllocation $budget, float $amount): BudgetAllocation;

    /**
     * Actualize budget
     */
    public function actualizeBudget(BudgetAllocation $budget, float $amount): BudgetAllocation;

    /**
     * Release budget
     */
    public function releaseBudget(BudgetAllocation $budget, float $amount): BudgetAllocation;

    /**
     * Check if budget has sufficient funds
     */
    public function hasSufficientFunds(BudgetAllocation $budget, float $amount): bool;

    /**
     * Get budget with lock for update
     */
    public function findForUpdate(string $budgetCode, ?int $departmentId = null): ?BudgetAllocation;
}
