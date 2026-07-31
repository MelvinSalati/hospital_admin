<?php
// app/Repositories/Contracts/BudgetTransactionRepositoryInterface.php

namespace App\Repositories\Contracts\Budgets;

use App\Models\Budgets\BudgetTransaction;
use Illuminate\Database\Eloquent\Collection;

interface BudgetTransactionRepositoryInterface
{
    /**
     * Create a budget transaction
     */
    public function create(array $data): BudgetTransaction;

    /**
     * Get transactions by budget code
     */
    public function getByBudgetCode(string $budgetCode, ?int $limit = null): Collection;

    /**
     * Get transactions by reference
     */
    public function getByReference(string $referenceType, int $referenceId): Collection;

    /**
     * Get transactions by date range
     */
    public function getByDateRange(string $budgetCode, string $from, string $to): Collection;

    /**
     * Get total by budget code
     */
    public function getTotalByBudgetCode(string $budgetCode): float;
}
