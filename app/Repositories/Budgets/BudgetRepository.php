<?php


namespace App\Repositories\Budgets;

use App\Models\Budgets\BudgetAllocation;
use App\Repositories\Contracts\Budgets\BudgetRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class BudgetRepository implements BudgetRepositoryInterface
{
    public function findByCode(string $budgetCode, ?int $departmentId = null): ?BudgetAllocation
    {
        return BudgetAllocation::with(['department', 'category'])
            ->where('budget_code', $budgetCode)
            ->when($departmentId, function ($query) use ($departmentId) {
                return $query->where('department_id', $departmentId);
            })
            ->first();
    }

    public function getActiveBudgets(array $filters = []): Collection
    {
        $query = BudgetAllocation::with(['department', 'category'])
            ->where('status', 'active');

        if (!empty($filters['department_id'])) {
            $query->where('department_id', $filters['department_id']);
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('budget_code', 'LIKE', "%{$filters['search']}%")
                    ->orWhere('budget_name', 'LIKE', "%{$filters['search']}%");
            });
        }

        if (!empty($filters['year'])) {
            $query->where('fiscal_year', $filters['year']);
        }

        if (!empty($filters['has_available'])) {
            $query->where('available_amount', '>', 0);
        }

        return $query->orderBy('budget_code')->get();
    }

    public function getDepartmentBudgets(int $departmentId, ?int $year = null): Collection
    {
        $year = $year ?? date('Y');

        return BudgetAllocation::with(['category'])
            ->where('department_id', $departmentId)
            ->where('fiscal_year', $year)
            ->where('status', 'active')
            ->orderBy('budget_code')
            ->get();
    }

    public function updateAmounts(BudgetAllocation $budget, array $data): BudgetAllocation
    {
        $budget->update($data);
        return $budget->fresh();
    }

    public function reserveBudget(BudgetAllocation $budget, float $amount): BudgetAllocation
    {
        return DB::transaction(function () use ($budget, $amount) {
            $budget = BudgetAllocation::where('id', $budget->id)
                ->lockForUpdate()
                ->first();

            $budget->reserved_amount += $amount;
            $budget->save();

            return $budget->fresh();
        });
    }

    public function commitBudget(BudgetAllocation $budget, float $amount): BudgetAllocation
    {
        return DB::transaction(function () use ($budget, $amount) {
            $budget = BudgetAllocation::where('id', $budget->id)
                ->lockForUpdate()
                ->first();

            $budget->reserved_amount -= $amount;
            $budget->committed_amount += $amount;
            $budget->save();

            return $budget->fresh();
        });
    }

    public function actualizeBudget(BudgetAllocation $budget, float $amount): BudgetAllocation
    {
        return DB::transaction(function () use ($budget, $amount) {
            $budget = BudgetAllocation::where('id', $budget->id)
                ->lockForUpdate()
                ->first();

            $budget->committed_amount -= $amount;
            $budget->actual_spent += $amount;
            $budget->save();

            return $budget->fresh();
        });
    }

    public function releaseBudget(BudgetAllocation $budget, float $amount): BudgetAllocation
    {
        return DB::transaction(function () use ($budget, $amount) {
            $budget = BudgetAllocation::where('id', $budget->id)
                ->lockForUpdate()
                ->first();

            if ($budget->reserved_amount >= $amount) {
                $budget->reserved_amount -= $amount;
            } elseif ($budget->committed_amount >= $amount) {
                $budget->committed_amount -= $amount;
            }

            $budget->save();
            return $budget->fresh();
        });
    }

    public function hasSufficientFunds(BudgetAllocation $budget, float $amount): bool
    {
        return $budget->available_amount >= $amount;
    }

    public function findForUpdate(string $budgetCode, ?int $departmentId = null): ?BudgetAllocation
    {
        return BudgetAllocation::where('budget_code', $budgetCode)
            ->when($departmentId, function ($query) use ($departmentId) {
                return $query->where('department_id', $departmentId);
            })
            ->lockForUpdate()
            ->first();
    } 

    public function getAllActiveBudgets(){
        return BudgetAllocation::with(['category'])->get();
    }
}
