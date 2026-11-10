<?php
// app/Repositories/Budgets/BudgetTransactionRepository.php

namespace App\Repositories\Budgets;

use App\Models\Budgets\BudgetTransaction;

class BudgetTransactionRepository
{
    public function create(array $data): BudgetTransaction
    {
        return BudgetTransaction::create($data);
    }

    public function forBudget(string $budgetCode)
    {
        return BudgetTransaction::where('budget_code', $budgetCode)
            ->orderByDesc('transaction_date')
            ->get();
    }
}
