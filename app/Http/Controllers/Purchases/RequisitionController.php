<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\Budgets\BudgetService;
use App\Services\Purchases\PurchaseService;
use App\Notifications\PurchaseRequestApproval;
use App\Models\User;
use App\Models\Bulkstores\PurchaseRequisition;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Helpers\UserSessionHelper;
class RequisitionController extends Controller
{
    protected BudgetService $budgetRequisitionService;
    protected PurchaseService $purchaseRequistionService;

    public function __construct(
        BudgetService $budgetRequisitionService, 
        PurchaseService $purchaseRequisitionService
    ) {
        $this->budgetRequisitionService = $budgetRequisitionService;
        $this->purchaseRequistionService = $purchaseRequisitionService;
    }

    /**
     * Check budget availability
     */
    public function checkBudget(string $budget, float $amount)
    {
        $result = $this->budgetRequisitionService->checkAvailability(
            $budget,
            $amount
        );

        return response()->json($result);
    }

    /**
     * Get all active budgets
     */
    public function getBudgets(Request $request)
    {
        $filters = [
            'department_id' => $request->department_id,
            'search' => $request->search,
            'year' => $request->year,
            'has_available' => $request->has_available,
        ];

        $result = $this->budgetRequisitionService->getActiveBudgets($filters);
        return response()->json($result);
    }

    /**
     * Get department budget summary
     */
    public function getDepartmentSummary(Request $request, int $departmentId)
    {
        $year = $request->year ?? date('Y');
        $result = $this->budgetRequisitionService->getDepartmentSummary($departmentId, $year);
        return response()->json($result);
    }

    /**
     * Create a new purchase requisition
     */
    public function createRequisition(Request $request)
    {
             // ✅ With 'auth:web' middleware, user is automatically authenticated
        // Get the authenticated user
        $user = Auth::user();
        
        // ✅ For 'auth:web', you can also use:
        // $user = $request->user();
        // $user = auth()->user();


if (!function_exists('user')) {
    function user() { 
        return UserSessionHelper::user(); 
    }
}

if (!function_exists('userId')) {
    function userId() { 
        return UserSessionHelper::id(); 
    }
}

if (!function_exists('isAuth')) {
    function isAuth() { 
        return UserSessionHelper::check(); 
    }
}

if (!function_exists('isAdmin')) {
    function isAdmin() { 
        return UserSessionHelper::isAdmin(); 
    }
}

if (!function_exists('isSupervisor')) {
    function isSupervisor() { 
        return UserSessionHelper::isSupervisor(); 
    }
}

if (!function_exists('canApprove')) {
    function canApprove() { 
        return UserSessionHelper::canApprove(); 
    }
}

if (!function_exists('canReleaseFunds')) {
    function canReleaseFunds() { 
        return UserSessionHelper::canReleaseFunds(); 
    }
}

if (!function_exists('userRole')) {
    function userRole() { 
        return UserSessionHelper::role(); 
    }
}

if (!function_exists('userDetails')) {
    function userDetails() { 
        return UserSessionHelper::details(); 
    }
}
    
        $validator = Validator::make($request->all(), [
            'department_id' => 'required|integer|exists:departments,id',
            'budget_code' => 'required|string|exists:budget_allocations,budget_code',
            'required_date' => 'required|date|after_or_equal:today',
            'priority' => 'required|in:low,medium,high,urgent',
            'justification' => 'required|string|min:10',
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'delivery_required' => 'boolean',
            'delivery_address' => 'nullable|string|max:500',
            'special_instructions' => 'nullable|string|max:1000',
            'cost_center' => 'nullable|string|max:50',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.estimated_unit_price' => 'required|numeric|min:0',
            'items.*.required_by_date' => 'nullable|date|after_or_equal:today',
            'items.*.notes' => 'nullable|string|max:500',
            'total_amount' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $validated = $validator->validated();
            $requisition = $this->purchaseRequistionService->createPurchaseRequisition($validated);

            // ✅ Send notification to supervisor
            $supervisor = User::where('is_supervisor', true)->first();
            
            if ($supervisor) {
                $supervisor->notify(new PurchaseRequestApproval(
                    $requisition,
                    'supervisor_approval',
                    $supervisor->name
                ));
                
                Log::info('Supervisor notification sent', [
                    'requisition_id' => $requisition->id,
                    'supervisor_id' => $supervisor->id,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Purchase requisition created successfully',
                'data' => $requisition,
            ], 201);
            
        } catch (\Exception $e) {
            Log::error('Failed to create requisition:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create requisition: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve a requisition (Supervisor or Admin)
     */
    public function approveRequisition(Request $request, $authorityId)
    {
        try {
            $requisition = PurchaseRequisition::with(['requester', 'department'])->findOrFail($authorityId);
            $user = User::findOrFail(49);


         
            // Check if user can approve
            if (!$user->is_admin || !$user->is_supervisor) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to approve this requisition.',
                ], 403);
            }

            // check if supervisor is trying to release funds
            if ($user->is_supervisor && $request->has('release_funds') && $request->release_funds) {
                return response()->json([
                    'success' => false,
                    'message' => 'Supervisors cannot release funds. Please contact an admin.',
                ], 403);
            }

            // Validate approval code
            if (!$user->approval_code || $user->approval_code !== md5($request->approval_code)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid approval code.',
                ], 401);
            }

            // Update requisition status
            $requisition->status = $user->is_admin ? 'approved' : 'pending_admin';
            $requisition->approved_by = $user->id;
            $requisition->approved_at = now();
            
            if ($user->is_admin && $request->release_funds) {
                $requisition->funds_released_at = now();
                $requisition->funds_released_by = $user->id;
            }
            
            $requisition->save();

            // ==========================================
            // NOTIFY THE REQUESTER
            // ==========================================
            if ($requisition->requester) {
                $action = $user->is_admin ? 'admin_approved' : 'supervisor_approved';
                
                $requisition->requester->notify(new PurchaseRequestApproval(
                    $requisition,
                    $action,
                    $user->name
                ));
                
                Log::info('Requester notification sent for approval', [
                    'requisition_id' => $requisition->id,
                    'requester_id' => $requisition->requester->id,
                    'action' => $action,
                ]);
            }

            // If admin approved, notify supervisor as well
            if ($user->is_admin && $requisition->supervisor_id) {
                $supervisor = User::find($requisition->supervisor_id);
                if ($supervisor) {
                    $supervisor->notify(new PurchaseRequestApproval(
                        $requisition,
                        'admin_approved',
                        $user->name
                    ));
                    
                    Log::info('Supervisor notification sent for admin approval', [
                        'requisition_id' => $requisition->id,
                        'supervisor_id' => $supervisor->id,
                    ]);
                }
            }

            // ✅ Notify the approver themselves
            $user->notify(new PurchaseRequestApproval(
                $requisition,
                'approval_confirmation',
                $user->name
            ));

            return response()->json([
                'success' => true,
                'message' => $user->is_admin ? 'Requisition approved and funds released!' : 'Requisition approved by supervisor. Awaiting admin approval.',
                'data' => $requisition,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to approve requisition:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve requisition: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reject a requisition
     */
    public function rejectRequisition(Request $request, $id)
    {
        try {
            $requisition = PurchaseRequisition::with(['requester', 'department'])->findOrFail($id);
            $user = auth()->user();
            $reason = $request->input('reason', 'No reason provided');

            // Check permission
            $isAuthorized = $user->is_admin || 
                           ($user->is_supervisor && $user->department_id === $requisition->department_id);
            
            if (!$isAuthorized) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to reject this requisition.',
                ], 403);
            }

            // ✅ Update requisition status
            $requisition->status = 'rejected';
            $requisition->rejected_by = $user->id;
            $requisition->rejected_at = now();
            $requisition->rejection_reason = $reason;
            $requisition->save();

            // ==========================================
            // ✅ NOTIFY THE REQUESTER
            // ==========================================
            if ($requisition->requester) {
                $requisition->requester->notify(new PurchaseRequestApproval(
                    $requisition,
                    'rejected',
                    $user->name
                ));
                
                Log::info('Requester notified of rejection', [
                    'requisition_id' => $requisition->id,
                    'requester_id' => $requisition->requester->id,
                    'reason' => $reason,
                ]);
            }

            // ✅ Notify supervisor if admin rejected
            if ($user->is_admin && $requisition->supervisor_id) {
                $supervisor = User::find($requisition->supervisor_id);
                if ($supervisor) {
                    $supervisor->notify(new PurchaseRequestApproval(
                        $requisition,
                        'rejected',
                        $user->name
                    ));
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Requisition rejected successfully',
                'data' => $requisition,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to reject requisition:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject requisition: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Release funds for a requisition (Admin only)
     */
    public function releaseFunds(Request $request, $id)
    {
        try {
            $requisition = PurchaseRequisition::with(['requester', 'department'])->findOrFail($id);
            $user = auth()->user();

            // ✅ ONLY ADMIN can release funds
            if (!Gate::allows('releaseFunds', $requisition)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can release funds.',
                ], 403);
            }

            // ✅ Validate approval code
            if (!$user->approval_code || $user->approval_code !== $request->approval_code) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid approval code.',
                ], 401);
            }

            // ✅ Update requisition
            $requisition->status = 'funds_released';
            $requisition->funds_released_at = now();
            $requisition->funds_released_by = $user->id;
            $requisition->save();

            // ==========================================
            // ✅ NOTIFY THE REQUESTER
            // ==========================================
            if ($requisition->requester) {
                $requisition->requester->notify(new PurchaseRequestApproval(
                    $requisition,
                    'funds_released',
                    $user->name
                ));
                
                Log::info('Requester notified of funds release', [
                    'requisition_id' => $requisition->id,
                    'requester_id' => $requisition->requester->id,
                ]);
            }

            // ✅ Notify supervisor
            if ($requisition->supervisor_id) {
                $supervisor = User::find($requisition->supervisor_id);
                if ($supervisor) {
                    $supervisor->notify(new PurchaseRequestApproval(
                        $requisition,
                        'funds_released',
                        $user->name
                    ));
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Funds released successfully',
                'data' => $requisition,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to release funds:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to release funds: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get all requisitions with filters
     */
    public function getRequisitions()
    {
        try {
            $result = $this->purchaseRequistionService->getRequisitions();

            return response()->json([
                'success' => true,
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch requisitions: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a single requisition by ID
     */
    public function getRequisition($id)
    {
        try {
            $requisition = $this->purchaseRequistionService->getRequisitionById($id);

            return response()->json([
                'success' => true,
                'data' => $requisition,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Requisition not found: ' . $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Update a requisition
     */
    public function updateRequisition(Request $request, $id)
    {
        // ... update logic
    }

    /**
     * Delete a requisition (soft delete)
     */
    public function deleteRequisition($id)
    {
        try {
            $this->purchaseRequistionService->deleteRequisition($id);

            return response()->json([
                'success' => true,
                'message' => 'Requisition deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete requisition: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get requisition statistics
     */
    public function getRequisitionStats()
    {
        try {
            $stats = $this->purchaseRequistionService->getRequisitionStats();

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch requisition stats: ' . $e->getMessage(),
            ], 500);
        }
    }
}