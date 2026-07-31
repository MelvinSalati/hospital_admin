<?php
// app/Services/BudgetService.php

namespace App\Services\Budgets;

use App\Models\Budgets\BudgetAllocation;
use App\Repositories\Budgets\BudgetRepository;
use App\Repositories\Budgets\BudgetTransactionRepository;

use Illuminate\Support\Facades\Log;

class BudgetService 
{
    protected BudgetRepository $budgetRepository;
    protected BudgetTransactionRepository $transactionRepository;

    public function __construct(
        BudgetRepository $budgetRepository,
        BudgetTransactionRepository $transactionRepository
    ) {
        $this->budgetRepository = $budgetRepository;
        $this->transactionRepository = $transactionRepository;
    }

    /**
     * Check budget availability
     */
    public function checkAvailability(string $budgetCode, float $amount, ?int $departmentId = null): array
    {
        try {
            $budget = $this->budgetRepository->findByCode($budgetCode, $departmentId);

            if (!$budget) {
                return $this->errorResponse('Budget code not found');
            }

            $isSufficient = $this->budgetRepository->hasSufficientFunds($budget, $amount);
            $utilization = $budget->utilization_percentage;

            return [
                'success' => true,
                'budget' => $this->formatBudgetData($budget),
                'request' => [
                    'amount' => $amount,
                    'is_sufficient' => $isSufficient,
                    'shortfall' => $isSufficient ? 0 : $amount - $budget->available_amount,
                    'remaining_after' => $isSufficient ? $budget->available_amount - $amount : 0,
                ],
                'recommendation' => $this->getRecommendation($utilization, $isSufficient, $amount, $budget->available_amount),
            ];
        } catch (\Exception $e) {
            Log::error('Budget check failed: ' . $e->getMessage(), [
                'budget_code' => $budgetCode,
                'amount' => $amount,
                'department_id' => $departmentId,
            ]);

            return $this->errorResponse('Failed to check budget: ' . $e->getMessage());
        }
    }

    /**
     * Reserve budget
     */
    public function reserveBudget(string $budgetCode, float $amount, string $referenceType, int $referenceId, ?int $departmentId = null): array
    {
        try {
            $budget = $this->budgetRepository->findForUpdate($budgetCode, $departmentId);

            if (!$budget) {
                return $this->errorResponse('Budget not found');
            }

            if (!$this->budgetRepository->hasSufficientFunds($budget, $amount)) {
                return $this->errorResponse(
                    'Insufficient budget',
                    [
                        'available' => $budget->available_amount,
                        'required' => $amount,
                        'shortfall' => $amount - $budget->available_amount,
                    ]
                );
            }

            // Reserve
            $budget = $this->budgetRepository->reserveBudget($budget, $amount);

            // Log transaction
            $this->transactionRepository->create([
                'budget_code' => $budgetCode,
                'transaction_type' => 'reservation',
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'description' => "Budget reserved for {$referenceType} #{$referenceId}",
                'transaction_date' => now()
            ]);

            return [
                'success' => true,
                'message' => 'Budget reserved successfully',
                'budget' => [
                    'code' => $budget->budget_code,
                    'available' => $budget->available_amount,
                    'reserved' => $budget->reserved_amount,
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Budget reservation failed: ' . $e->getMessage(), [
                'budget_code' => $budgetCode,
                'amount' => $amount,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
            ]);

            return $this->errorResponse('Failed to reserve budget: ' . $e->getMessage());
        }
    }

    /**
     * Commit budget
     */
    public function commitBudget(string $budgetCode, float $amount, string $referenceType, int $referenceId, ?int $departmentId = null): array
    {
        try {
            $budget = $this->budgetRepository->findForUpdate($budgetCode, $departmentId);

            if (!$budget) {
                return $this->errorResponse('Budget not found');
            }

            if ($budget->reserved_amount < $amount) {
                return $this->errorResponse(
                    'Insufficient reserved budget',
                    [
                        'reserved' => $budget->reserved_amount,
                        'required' => $amount,
                    ]
                );
            }

            $budget = $this->budgetRepository->commitBudget($budget, $amount);

            $this->transactionRepository->create([
                'budget_code' => $budgetCode,
                'transaction_type' => 'commitment',
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'description' => "Budget committed for {$referenceType} #{$referenceId}",
                'transaction_date' => now()
            ]);

            return [
                'success' => true,
                'message' => 'Budget committed successfully',
                'budget' => [
                    'code' => $budget->budget_code,
                    'available' => $budget->available_amount,
                    'committed' => $budget->committed_amount,
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Budget commitment failed: ' . $e->getMessage(), [
                'budget_code' => $budgetCode,
                'amount' => $amount,
            ]);

            return $this->errorResponse('Failed to commit budget: ' . $e->getMessage());
        }
    }

    /**
     * Actualize budget
     */
    public function actualizeBudget(string $budgetCode, float $amount, string $referenceType, int $referenceId, ?int $departmentId = null): array
    {
        try {
            $budget = $this->budgetRepository->findForUpdate($budgetCode, $departmentId);

            if (!$budget) {
                return $this->errorResponse('Budget not found');
            }

            if ($budget->committed_amount < $amount) {
                return $this->errorResponse(
                    'Insufficient committed budget',
                    [
                        'committed' => $budget->committed_amount,
                        'required' => $amount,
                    ]
                );
            }

            $budget = $this->budgetRepository->actualizeBudget($budget, $amount);

            $this->transactionRepository->create([
                'budget_code' => $budgetCode,
                'transaction_type' => 'actual',
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'description' => "Budget actualized for {$referenceType} #{$referenceId}",
                'transaction_date' => now(),
            ]);

            return [
                'success' => true,
                'message' => 'Budget actualized successfully',
                'budget' => [
                    'code' => $budget->budget_code,
                    'available' => $budget->available_amount,
                    'actual_spent' => $budget->actual_spent,
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Budget actualization failed: ' . $e->getMessage(), [
                'budget_code' => $budgetCode,
                'amount' => $amount,
            ]);

            return $this->errorResponse('Failed to actualize budget: ' . $e->getMessage());
        }
    }

    /**
     * Release budget
     */
    public function releaseBudget(string $budgetCode, float $amount, string $referenceType, int $referenceId, ?string $reason = null, ?int $departmentId = null): array
    {
        try {
            $budget = $this->budgetRepository->findForUpdate($budgetCode, $departmentId);

            if (!$budget) {
                return $this->errorResponse('Budget not found');
            }

            $budget = $this->budgetRepository->releaseBudget($budget, $amount);

            $this->transactionRepository->create([
                'budget_code' => $budgetCode,
                'transaction_type' => 'reversal',
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'amount' => $amount,
                'description' => "Budget released for {$referenceType} #{$referenceId}" . ($reason ? " ({$reason})" : ''),
                'transaction_date' => now()
            ]);

            return [
                'success' => true,
                'message' => 'Budget released successfully',
                'budget' => [
                    'code' => $budget->budget_code,
                    'available' => $budget->available_amount,
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Budget release failed: ' . $e->getMessage(), [
                'budget_code' => $budgetCode,
                'amount' => $amount,
            ]);

            return $this->errorResponse('Failed to release budget: ' . $e->getMessage());
        }
    }

    /**
     * Get department budget summary
     */
    public function getDepartmentSummary(int $departmentId, ?int $year = null): array
    {
        $year = $year ?? date('Y');
        $budgets = $this->budgetRepository->getDepartmentBudgets($departmentId, $year);

        $totalAllocated = $budgets->sum('allocated_amount');
        $totalReserved = $budgets->sum('reserved_amount');
        $totalCommitted = $budgets->sum('committed_amount');
        $totalActual = $budgets->sum('actual_spent');

        return [
            'department_id' => $departmentId,
            'fiscal_year' => $year,
            'summary' => [
                'total_allocated' => $totalAllocated,
                'total_reserved' => $totalReserved,
                'total_committed' => $totalCommitted,
                'total_actual_spent' => $totalActual,
                'total_available' => $totalAllocated - $totalReserved - $totalCommitted - $totalActual,
                'overall_utilization' => $totalAllocated > 0 ? round(($totalActual / $totalAllocated) * 100, 2) : 0,
            ],
            'budgets' => $budgets->map(function ($budget) {
                return [
                    'id' => $budget->id,
                    'code' => $budget->budget_code,
                    'name' => $budget->budget_name,
                    'category' => $budget->category->name ?? 'N/A',
                    'allocated' => $budget->allocated_amount,
                    'reserved' => $budget->reserved_amount,
                    'committed' => $budget->committed_amount,
                    'actual_spent' => $budget->actual_spent,
                    'available' => $budget->available_amount,
                    'utilization' => $budget->utilization_percentage,
                    'utilization_color' => $this->getUtilizationColor($budget->utilization_percentage),
                    'status' => $budget->status_label,
                    'alert_triggered' => $budget->alert_triggered,
                ];
            }),
        ];
    }

    /**
     * Get active budgets
     */
    public function getActiveBudgets(array $filters = []): array
    {
        $budgets = $this->budgetRepository->getActiveBudgets($filters);

        return [
            'data' => $budgets->map(function ($budget) {
                return [
                    'id' => $budget->id,
                    'budget_code' => $budget->budget_code,
                    'budget_name' => $budget->budget_name,
                    'category' => $budget->category->name ?? 'N/A',
                    'department' => $budget->department->name ?? 'N/A',
                    'allocated' => $budget->allocated_amount,
                    'available' => $budget->available_amount,
                    'utilization' => $budget->utilization_percentage,
                    'utilization_color' => $this->getUtilizationColor($budget->utilization_percentage),
                    'status' => $budget->status_label,
                ];
            }),
        ];
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private function formatBudgetData(BudgetAllocation $budget): array
    {
        return [
            'id' => $budget->id,
            'code' => $budget->budget_code,
            'name' => $budget->budget_name,
            'category' => $budget->category->name ?? 'N/A',
            'department' => $budget->department->name ?? 'N/A',
            'allocated' => $budget->allocated_amount,
            'reserved' => $budget->reserved_amount,
            'committed' => $budget->committed_amount,
            'actual_spent' => $budget->actual_spent,
            'available' => $budget->available_amount,
            'utilization' => $budget->utilization_percentage,
            'utilization_color' => $this->getUtilizationColor($budget->utilization_percentage),
            'utilization_level' => $this->getUtilizationLevel($budget->utilization_percentage),
            'status' => $budget->status_label,
            'alert_triggered' => $budget->alert_triggered,
            'alert_message' => $budget->alert_message,
            'warning_threshold' => $budget->warning_threshold,
            'critical_threshold' => $budget->critical_threshold,
        ];
    }

    private function getUtilizationColor(float $utilization): string
    {
        if ($utilization >= 90) return 'danger';
        if ($utilization >= 75) return 'warning';
        if ($utilization >= 50) return 'info';
        return 'success';
    }

    private function getUtilizationLevel(float $utilization): string
    {
        if ($utilization >= 90) return 'critical';
        if ($utilization >= 75) return 'warning';
        if ($utilization >= 50) return 'moderate';
        return 'good';
    }

    private function getRecommendation(float $utilization, bool $isSufficient, float $requested, float $available): string
    {
        if (!$isSufficient) {
            return sprintf(
                '⚠️ Insufficient budget. Required: %s, Available: %s, Shortfall: %s. Please reduce quantities or select a different budget.',
                number_format($requested, 2),
                number_format($available, 2),
                number_format($requested - $available, 2)
            );
        }

        if ($utilization >= 90) return '🔴 CRITICAL: Budget nearly depleted. Consider priority approval.';
        if ($utilization >= 75) return '🟡 WARNING: Budget utilization is high. Monitor spending.';
        if ($utilization >= 50) return '🟢 Budget utilization is moderate. Proceed with normal approval.';
        return '🟢 Budget is healthy. Proceed with request.';
    }

    private function errorResponse(string $message, array $data = []): array
    {
        return array_merge([
            'success' => false,
            'message' => $message,
        ], $data);
    } 

    public function getAllActiveBudgets(){
        return  $this->budgetRepository->getAllActiveBudgets();
    }
}
