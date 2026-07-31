<?php

namespace App\Repositories\Budgets;

use App\Models\Budgets\BudgetTransaction;
use App\Repositories\Contracts\Budgets\BudgetTransactionRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class BudgetTransactionRepository implements BudgetTransactionRepositoryInterface
{
    public function create(array $data): BudgetTransaction
    {
        return BudgetTransaction::create($data);
    }

    public function getByBudgetCode(string $budgetCode, ?int $limit = null): Collection
    {
        $query = BudgetTransaction::where('budget_code', $budgetCode)
            ->orderBy('transaction_date', 'desc');

        if ($limit) {
            $query->limit($limit);
        }

        return $query->get();
    }

    public function getByReference(string $referenceType, int $referenceId): Collection
    {
        return BudgetTransaction::where('reference_type', $referenceType)
            ->where('reference_id', $referenceId)
            ->orderBy('transaction_date', 'desc')
            ->get();
    }

    public function getByDateRange(string $budgetCode, string $from, string $to): Collection
    {
        return BudgetTransaction::where('budget_code', $budgetCode)
            ->whereBetween('transaction_date', [$from, $to])
            ->orderBy('transaction_date', 'desc')
            ->get();
    }

    public function getTotalByBudgetCode(string $budgetCode): float
    {
        return BudgetTransaction::where('budget_code', $budgetCode)
            ->sum('amount');
    }
}
