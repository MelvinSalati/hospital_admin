<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Budgets\BudgetAllocation;
use App\Models\Budgets\BudgetTransaction;
use App\Models\BulkStores\PurchaseRequisition;
use App\Models\User;
use Illuminate\Http\Request;
use App\Services\UserService;
use App\Services\Budgets\BudgetService;
use App\Helpers\NumberGenerator;
use App\Policies\ApprovePurchaseRequestPolicy;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminController extends Controller
{
    protected UserService $userService;
    protected BudgetService $budgetService;
    protected ApprovePurchaseRequestPolicy $policy;

    public function __construct(
        UserService $userService,
        BudgetService $budgetService,
        ApprovePurchaseRequestPolicy $policy
    ) {
        $this->userService = $userService;
        $this->budgetService = $budgetService;
        $this->policy = $policy;
    }

    /**
     * Get all system users
     */
    public function getSystemUsers()
    {
        try {
            $allUsers = $this->userService->getUsers();
            return response()->json([
                'users' => $allUsers,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all active budgets
     */
    public function getBudgets()
    {
        try {
            $budget = $this->budgetService->getAllActiveBudgets();
            return response()->json([
                'budgets' => $budget,
                'success' => true
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all pending purchase requisitions
     */
    public function getPurchaseRequisitions()
    {
        try {
            $purchaseRequisition = PurchaseRequisition::with([
                'department',
                'requester',
                'supplier',
                'budgetAllocation',
                'items.product'
            ])->where('status', '<>', 'approved')->get();

            return response()->json([
                'orders' => $purchaseRequisition,
                'success' => true
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch purchase requisitions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all approved purchase requisitions (purchase orders)
     */
    public function getPurchaseOrders()
    {
        try {
            $purchaseRequisition = PurchaseRequisition::with([
                'department',
                'requester',
                'supplier',
                'budgetAllocation',
                'items.product'
            ])->where('status', 'approved')->get();

            return response()->json([
                'orders' => $purchaseRequisition,
                'success' => true
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch purchase requisitions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check budget availability for a requisition
     */
    public function checkBudget($requisitionId, Request $request)
    {
        try {
            DB::beginTransaction();

            $requisition = PurchaseRequisition::with(['budgetAllocation'])->findOrFail($requisitionId);
            $user = auth()->user();

            Log::info('Check budget called', [
                'requisition_id' => $requisitionId,
                'user_id' => $user ? $user->id : null,
                'user_is_admin' => $user ? $user->is_admin : null,
                'user_approval_code' => $user ? $user->approval_code : null
            ]);

            // Check if user has permission to approve
            if (!$this->policy->approve($user, $requisition)) {
                Log::warning('User does not have permission to approve', [
                    'user_id' => $user ? $user->id : null,
                    'requisition_id' => $requisitionId
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to approve this requisition. Only admins and supervisors can approve.'
                ], 403);
            }

            if (!$requisition->budget_code) {
                return response()->json([
                    'success' => false,
                    'message' => 'No budget code assigned to this requisition.'
                ], 400);
            }

            // Check if requisition is pending
            if ($requisition->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Requisition is not in pending status.'
                ], 400);
            }

            $budgetAllocation = BudgetAllocation::where('budget_code', $requisition->budget_code)
                ->where('status', 'active')
                ->first();

            if (!$budgetAllocation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Budget allocation not found for the given budget code.'
                ], 404);
            }

            $amount = floatval($requisition->estimated_total);
            $available = floatval($budgetAllocation->available_amount);
            $hasSufficientFunds = $available >= $amount;

            // Create a reservation transaction if funds are sufficient
            if ($hasSufficientFunds) {
                $budgetAllocation->reserveBudget($amount, 'PR', $requisition->id);

                Log::info('Budget reserved successfully', [
                    'requisition_id' => $requisition->id,
                    'pr_number' => $requisition->pr_number,
                    'amount' => $amount,
                    'user_id' => $user ? $user->id : null
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'budget_check' => [
                        'has_sufficient_funds' => $hasSufficientFunds,
                        'budget_code' => $budgetAllocation->budget_code,
                        'available_balance' => $available,
                        'requested_amount' => $amount,
                        'budget_line' => $budgetAllocation->budget_name,
                        'budget_holder' => $budgetAllocation->creator->name ?? 'N/A',
                        'currency' => 'ZMW',
                        'message' => $hasSufficientFunds
                            ? 'Budget has sufficient funds. You can proceed with approval.'
                            : 'Insufficient budget funds. Available: ' . number_format($available, 2)
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to check budget: ' . $e->getMessage(), [
                'requisition_id' => $requisitionId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to check budget: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve a purchase requisition
     */
    public function approveRequisition($requisitionId, Request $request)
    {
        try {
            DB::beginTransaction();

            Log::info('Approve requisition called', [
                'requisition_id' => $requisitionId,
                'request_data' => $request->all(),
                'user_id' => $request->approved_by
            ]);

            // Validate request
            $validator = validator($request->all(), [
                'approval_code' => 'required|string',
                'comments' => 'nullable|string',
                'approved_by' => 'required|integer|exists:users,id',
            ]);

            if ($validator->fails()) {
                Log::warning('Validation failed', [
                    'errors' => $validator->errors()->toArray()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Find the requisition with relationships
            $requisition = PurchaseRequisition::with(['items', 'budgetAllocation'])->findOrFail($requisitionId);

            // Find the user who is approving
            $user = User::find($request->approved_by);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found with ID: ' . $request->approved_by
                ], 404);
            }

            Log::info('Found requisition and user', [
                'requisition_id' => $requisition->id,
                'requisition_status' => $requisition->status,
                'requisition_department_id' => $requisition->department_id,
                'requisition_budget_code' => $requisition->budget_code,
                'requisition_amount' => $requisition->estimated_total,
                'user_id' => $user->id,
                'user_is_admin' => $user->is_admin,
                'user_is_supervisor' => $user->is_supervisor,
                'user_department_id' => $user->department_id,
                'user_approval_code' => $user->approval_code,
            ]);

            // Check if user has permission to approve
            $canApprove = $this->policy->approve($user, $requisition);
            Log::info('Can approve check result', ['can_approve' => $canApprove]);

            if (!$canApprove) {
                $role = $this->policy->getUserRole($user);
                $message = 'You do not have permission to approve this requisition. ';
                if ($role === 'supervisor') {
                    $message .= 'Supervisors can only approve requisitions from their department (Department ID: ' . $user->department_id . ').';
                } else {
                    $message .= 'Only admins and supervisors can approve.';
                }
                return response()->json([
                    'success' => false,
                    'message' => $message
                ], 403);
            }

            // Check if requisition is in pending status
            if ($requisition->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This requisition is not in pending status. Current status: ' . $requisition->status
                ], 400);
            }

            // Check the user's approval_code from the users table
            if (empty($user->approval_code)) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not have an approval code assigned. Please contact administrator.'
                ], 400);
            }

            // Verify the approval code matches the user's approval_code
            if ($user->approval_code !== $request->approval_code) {
                Log::warning('Invalid approval code', [
                    'provided' => $request->approval_code,
                    'expected' => $user->approval_code
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid approval code. Please enter the correct approval code.'
                ], 400);
            }

            // Get budget allocation
            $budgetAllocation = BudgetAllocation::where('budget_code', $requisition->budget_code)
                ->where('status', 'active')
                ->first();

            Log::info('budget found', [$budgetAllocation]);

            if (!$budgetAllocation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Budget allocation not found or inactive for budget code: ' . $requisition->budget_code
                ], 404);
            }

            $amount = floatval($requisition->estimated_total);

            // Update requisition status
            $requisition->status = 'approved';
            $requisition->approved_by = $request->approved_by;
            $requisition->approved_at = now();
            $requisition->save();

            // Use the model's commitBudget method to move from reserved to committed
            $budgetAllocation->commitBudget($amount, 'PR', $requisition->id);

            DB::commit();

            Log::info('Requisition approved successfully', [
                'requisition_id' => $requisition->id,
                'pr_number' => $requisition->pr_number,
                'budget_code' => $requisition->budget_code,
                'amount' => $amount,
                'approved_by' => $request->approved_by,
                'approver_role' => $this->policy->getUserRole($user)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Requisition approved successfully',
                'data' => [
                    'requisition' => $requisition,
                    'budget_allocation' => $budgetAllocation
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to approve requisition: ' . $e->getMessage(), [
                'requisition_id' => $requisitionId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve requisition: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a purchase requisition
     */
    public function rejectRequisition($requisitionId, Request $request)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'approval_code' => 'required|string',
                'rejection_reason' => 'required|string',
                'rejected_by' => 'required|integer|exists:users,id',
            ]);

            $requisition = PurchaseRequisition::with(['budgetAllocation'])->findOrFail($requisitionId);
            $user = User::findOrFail($request->rejected_by);

            // Check if user has permission to reject
            if (!$this->policy->approve($user, $requisition)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to reject this requisition.'
                ], 403);
            }

            if ($requisition->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This requisition is not in pending status.'
                ], 400);
            }

            // Verify the approval code matches the user's approval_code
            if ($user->approval_code !== $request->approval_code) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid approval code.'
                ], 400);
            }

            // Update requisition status
            $requisition->status = 'rejected';
            $requisition->approved_by = $request->rejected_by;
            $requisition->approved_at = now();
            $requisition->justification = ($requisition->justification ? $requisition->justification . "\n\n" : '') .
                "Rejection Reason: " . $request->rejection_reason;
            $requisition->save();

            // Check if there were any reservations for this requisition
            $reservedAmount = BudgetTransaction::where('reference_type', 'PR')
                ->where('reference_id', $requisition->id)
                ->where('transaction_type', 'reservation')
                ->sum('amount');

            if ($reservedAmount > 0 && $requisition->budget_code) {
                $budgetAllocation = BudgetAllocation::where('budget_code', $requisition->budget_code)
                    ->where('status', 'active')
                    ->first();

                if ($budgetAllocation) {
                    // Reverse the reservation - release the reserved funds
                    $budgetAllocation->reserved_amount = floatval($budgetAllocation->reserved_amount) - $reservedAmount;
                    // Recalculate available amount and utilization
                    $allocated = floatval($budgetAllocation->allocated_amount);
                    $used = floatval($budgetAllocation->committed_amount) +
                        floatval($budgetAllocation->actual_spent) +
                        floatval($budgetAllocation->reserved_amount);
                    $budgetAllocation->available_amount = $allocated - $used;
                    $budgetAllocation->utilization_percentage = $allocated > 0 ? ($used / $allocated) * 100 : 0;
                    $budgetAllocation->save();

                    // Create reversal transaction
                    $transactionNo = NumberGenerator::generate(
                        'BT',
                        BudgetTransaction::class,
                        'custom',
                        [
                            'field' => 'transaction_no',
                            'length' => 5,
                            'separator' => '-',
                            'include_date' => true,
                            'date_format' => 'Ymd',
                            'reset_on' => 'day'
                        ]
                    );

                    BudgetTransaction::create([
                        'transaction_no' => $transactionNo,
                        'budget_code' => $requisition->budget_code,
                        'transaction_type' => 'reversal',
                        'reference_type' => 'PR',
                        'reference_id' => $requisition->id,
                        'amount' => -$reservedAmount,
                        'balance_before' => $budgetAllocation->available_amount + $reservedAmount,
                        'balance_after' => $budgetAllocation->available_amount,
                        'description' => "Reversal of reservation for rejected requisition: {$requisition->pr_number}",
                        'transaction_date' => now(),
                        'created_by' => $request->rejected_by,
                    ]);
                }
            }

            DB::commit();

            Log::info('Requisition rejected', [
                'requisition_id' => $requisition->id,
                'pr_number' => $requisition->pr_number,
                'reason' => $request->rejection_reason,
                'rejected_by' => $request->rejected_by
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Requisition rejected successfully',
                'data' => ['requisition' => $requisition]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to reject requisition: ' . $e->getMessage(), [
                'requisition_id' => $requisitionId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject requisition: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Release funds for an approved requisition
     * ONLY ADMIN can release funds
     */
    public function releaseFunds($requisitionId, Request $request)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'approval_code' => 'required|string',
                'comments' => 'nullable|string',
                'released_by' => 'required|integer|exists:users,id',
            ]);

            Log::info('Release funds request data', ['request' => $request->all()]);

            $requisition = PurchaseRequisition::with(['budgetAllocation'])->findOrFail($requisitionId);
            $user = User::findOrFail($request->released_by);

            // ONLY ADMIN can release funds - check if user is admin
            if (!$user->is_admin) {
                Log::warning('Non-admin user attempted to release funds', [
                    'user_id' => $user->id,
                    'requisition_id' => $requisitionId
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can release funds.'
                ], 403);
            }

            // Check if requisition is approved
            if ($requisition->status !== 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'This requisition is not approved.'
                ], 400);
            }

            // Check if funds are already released
            if ($requisition->funds_released) {
                return response()->json([
                    'success' => false,
                    'message' => 'Funds have already been released for this requisition.'
                ], 400);
            }

            Log::info('Approval code validation', [
                'provided' => $request->approval_code,
                'user_approval_code' => $user->approval_code
            ]);

            // Verify the approval code matches the user's approval_code
            if ($user->approval_code !== $request->approval_code) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid approval code.'
                ], 400);
            }

            // Get budget allocation
            $budgetAllocation = BudgetAllocation::where('budget_code', $requisition->budget_code)
                ->where('status', 'active')
                ->first();

            if (!$budgetAllocation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Budget allocation not found or inactive.'
                ], 404);
            }

            $amount = floatval($requisition->estimated_total);

            // Update requisition
            $requisition->funds_released = true;
            $requisition->funds_released_at = now();
            $requisition->funds_released_by = $request->released_by;
            $requisition->save();

            // Use the model's actualizeBudget method to move from committed to actual spent
            $budgetAllocation->actualizeBudget($amount, 'PR', $requisition->id);

            DB::commit();

            Log::info('Funds released for requisition', [
                'requisition_id' => $requisition->id,
                'pr_number' => $requisition->pr_number,
                'amount' => $amount,
                'released_by' => $request->released_by,
                'released_by_admin' => $user->is_admin
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Funds released successfully',
                'data' => [
                    'requisition' => $requisition,
                    'budget_allocation' => $budgetAllocation
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to release funds: ' . $e->getMessage(), [
                'requisition_id' => $requisitionId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to release funds: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user permissions for requisition actions
     */
    public function getUserPermissions($requisitionId)
    {
        try {
            $requisition = PurchaseRequisition::findOrFail($requisitionId);
            $user = auth()->user();

            return response()->json([
                'success' => true,
                'data' => [
                    'can_approve' => $this->policy->approve($user, $requisition),
                    'can_release_funds' => $this->policy->releaseFunds($user, $requisition),
                    'can_authorize' => $this->policy->authorize($user, $requisition),
                    'can_cancel' => $this->policy->cancel($user, $requisition),
                    'can_delete' => $this->policy->delete($user, $requisition),
                    'can_view' => $this->policy->viewRequisition($user, $requisition),
                    'has_approval_code' => $user->approval_code !== null,
                    'user_role' => $user->is_admin ? 'admin' : ($user->is_supervisor ? 'supervisor' : 'staff')
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get user permissions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate approval code for a user
     */
    public function validateApprovalCode(Request $request)
    {
        try {
            $request->validate([
                'approval_code' => 'required|string',
                'user_id' => 'required|integer|exists:users,id'
            ]);

            $user = User::findOrFail($request->user_id);

            Log::info('User details on validate approval code', ['user' => $user]);

            $isValid = $user->approval_code !== null && $user->approval_code === $request->approval_code;

            return response()->json([
                'success' => true,
                'data' => [
                    'valid' => $isValid,
                    'message' => $isValid ? 'Approval code is valid' : 'Invalid approval code'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate utilization percentage
     */
    private function calculateUtilization($budgetAllocation): float
    {
        $allocated = floatval($budgetAllocation->allocated_amount);
        if ($allocated <= 0) {
            return 0;
        }

        $used = floatval($budgetAllocation->actual_spent) +
            floatval($budgetAllocation->committed_amount) +
            floatval($budgetAllocation->reserved_amount);

        return min(100, ($used / $allocated) * 100);
    }
}
