<?php
// app/Repositories/Contracts/Budgets/BudgetRepositoryInterface.php

namespace App\Repositories\Contracts\Budgets;

use App\Models\Budgets\BudgetAllocation;
use Illuminate\Database\Eloquent\Collection;

interface BudgetRepositoryInterface
{
    public function findByCode(string $budgetCode, ?int $departmentId = null): ?BudgetAllocation;

    public function getActiveBudgets(array $filters = []): Collection;

    public function getDepartmentBudgets(int $departmentId, ?int $year = null): Collection;

    public function getAllActiveBudgets(): Collection;

    /**
     * The only mutation entry point.
     * Runs in one transaction: lock → mutate closure → save.
     * Closure must throw InsufficientBudget on invariant violation.
     */
    public function mutate(
        string $budgetCode,
        ?int $departmentId,
        callable $mutation
    ): ?BudgetAllocation;
}
