<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\BulkStores\ProductService;
use App\Models\BulkStores\Product;
use App\Models\Bulkstores\ProductAdjustment;
use App\Models\StockMovement;
use App\Models\Approval;
use App\Notifications\StockAdjustment as StockAdjustmentNotification;
use App\Jobs\StockAdjustmentJob;
use App\Helpers\NumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

class ProductController extends Controller
{
    protected ProductService $productService; 

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * Receive product page
     */
    public function receiveProduct($uuid)
    {
        return Inertia::render('bulkstore/Receive', [
            'product' => Product::where('product_uuid', $uuid)->first()
        ]);
    } 

    /**
     * Update product
     */
    public function updateProduct(Request $request, $productId): array
    {
        return [];
    } 

    /**
     * Search product by barcode
     */
    public function searchProduct($barcode)
    {
        try {
            $product = Product::where('product_code', 'LIKE', "%{$barcode}%")
                ->orWhere('product_name', 'LIKE', "%{$barcode}%")
                ->get();

            return response()->json([
                'status' => 'success',
                'product' => $product
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Generate unique adjustment number using NumberGenerator
     */
    protected function generateAdjustmentNumber(): string
    {
        // Use the NumberGenerator helper with custom format
        return NumberGenerator::generate(
            prefix: 'ADJ',
            model: '\App\Models\Bulkstores\ProductAdjustment',
            format: 'default', // Uses ADJ-YYYYMM-00001 format
            options: [
                'field' => 'adjustment_number',
                'length' => 4,
                'separator' => '-',
                'include_date' => true,
                'reset_on' => 'month', // Resets monthly
            ]
        );
    }

    /**
     * Alternative: Generate adjustment number using the custom method
     */
    protected function generateAdjustmentNumberCustom(): string
    {
        return NumberGenerator::generateCustom(
            prefix: 'ADJ',
            model: '\App\Models\Bulkstores\ProductAdjustment',
            options: [
                'field' => 'adjustment_number',
                'length' => 4,
                'separator' => '-',
                'include_date' => true,
                'date_format' => 'Ym',
                'reset_on' => 'month', 
            ]
        );
    }

    /**
     * Alternative: Generate adjustment number using yearly reset
     */
    protected function generateAdjustmentNumberYearly(): string
    {
        return NumberGenerator::generateYearly(
            prefix: 'ADJ',
            model: '\App\Models\Bulkstores\ProductAdjustment',
        );
    }

    /**
     * Stock Adjustment - Handles both draft and approval workflow
     */
    public function stockAdjustment(Request $request)
    {
        try {
            // 1. Validate request
            $validated = $request->validate([
                'product_id' => 'required|exists:products,id',
                'quantity' => 'required|integer|min:0',
                'reason' => 'required|string|min:10',
                'previous_quantity' => 'required|integer|min:0',
                'adjustment_type' => 'required|in:addition,reduction',
                'difference' => 'required|integer|not_in:0',
                'adjustment_category' => 'required|in:correction,damage,expiry,shortage,surplus,quality_issue',
                'evidence' => 'nullable|array',
                'evidence.*' => 'string',
                'batch_number' => 'nullable|string',
                'expiry_date' => 'nullable|date',
                'unit_cost' => 'nullable|numeric|min:0',
            ]);

            DB::beginTransaction();

            // 2. Determine if approval is required
            $requiresApproval = $validated['difference'] < 0; // Negative adjustments require approval
            $isNegative = $validated['difference'] < 0;
            
            // 3. Create adjustment record with generated number
            $adjustment = \App\Models\Bulkstores\ProductAdjustment::create([
                'adjustment_uuid' => (string) \Illuminate\Support\Str::uuid(),
                'adjustment_number' => $this->generateAdjustmentNumber(), // Using NumberGenerator
                'product_id' => $validated['product_id'],
                'department_id' => Auth::user()->department_id ?? 1,
                'bulk_store_id' => Auth::user()->bulk_store_id ?? null,
                // 'current_stock' => $validated['previous_quantity']?? 0,
                'proposed_quantity' => $validated['quantity'],
                'adjustment_difference' => $validated['difference'],
                'adjustment_type' => $validated['adjustment_type'],
                'category' => $validated['adjustment_category'],
                'batch_number' => $validated['batch_number'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'unit_cost' => $validated['unit_cost'] ?? null,
                'reason' => $validated['reason'],
                'evidence' => $validated['evidence'] ?? null,
                'status' => $requiresApproval ? 'pending' : 'draft',
                'approval_required' => $requiresApproval,
                'created_by' => $request->created_by,
                'requested_by' => $request->created_by,
                'requested_at' => $requiresApproval ? now() : null,
            ]);

            // 4. If approval is required
            if ($requiresApproval) {
                // Create approval record
                $approval = $this->createApprovalRecord($adjustment);
                
                // Dispatch job for async processing
                StockAdjustmentJob::dispatch([
                    'adjustment_id' => $adjustment->id,
                    'approval_id' => $approval->id,
                    'action' => 'pending_approval',
                    'user_id' => Auth::id(),
                    'notify_approvers' => true,
                ]);

                // Notify approvers
                $this->notifyApprovers($adjustment);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Stock adjustment submitted for approval',
                    'requires_approval' => true,
                    'approval_status' => 'pending',
                    'data' => [
                        'adjustment' => $adjustment,
                        'approval' => $approval,
                    ]
                ]);
            }

            // 5. For positive adjustments (auto-apply)
            $this->applyAdjustment($adjustment);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Stock adjusted successfully',
                'requires_approval' => false,
                'data' => $adjustment
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTrace() : null
            ], 500);
        }
    }

    /**
     * Apply the adjustment to actual stock
     */
    protected function applyAdjustment(ProductAdjustment $adjustment)
    {
        DB::transaction(function () use ($adjustment) {
            // Get product stock
            $product = Product::find($adjustment->product_id);
            
            // Update product stock
            $product->current_stock = $adjustment->proposed_quantity;
            $product->save();

            // Create stock movement record
            $movement = StockMovement::create([
                'movement_uuid' => (string) \Illuminate\Support\Str::uuid(),
                'product_id' => $adjustment->product_id,
                'department_id' => $adjustment->department_id,
                'bulk_store_id' => $adjustment->bulk_store_id,
                'from_department_id' => $adjustment->department_id,
                'to_department_id' => $adjustment->department_id,
                'created_by' => Auth::id(),
                'type' => 'adjustment',
                'quantity' => abs($adjustment->adjustment_difference),
                'balance_before' => $adjustment->current_stock,
                'balance_after' => $adjustment->proposed_quantity,
                'reference_number' => $adjustment->adjustment_number,
                'batch_number' => $adjustment->batch_number,
                'expiry_date' => $adjustment->expiry_date,
                'unit_cost' => $adjustment->unit_cost,
                'remarks' => "Applied from adjustment #{$adjustment->adjustment_number}: {$adjustment->reason}",
                'moved_at' => now(),
            ]);

            // Update adjustment status
            $adjustment->status = 'applied';
            $adjustment->applied_by = Auth::id();
            $adjustment->applied_at = now();
            $adjustment->save();

            // Notify requester
            if ($adjustment->requester) {
                $adjustment->requester->notify(new StockAdjustmentNotification(
                    $adjustment,
                    'applied',
                    Auth::user()->name
                ));
            }
        });
    }

    /**
     * Create approval record
     */
    protected function createApprovalRecord(ProductAdjustment $adjustment)
    {
        // Find approvers based on department
        $approvers = $this->getApprovers($adjustment->department_id);
        
        return Approval::create([
            'approvable_type' => get_class($adjustment),
            'approvable_id' => $adjustment->id,
            'workflow_name' => 'stock_adjustment',
            'approval_level' => 1,
            'level_name' => 'Manager Approval',
            'approver_id' => $approvers['manager'] ?? null,
            'approver_role' => 'manager',
            'approver_department_id' => $adjustment->department_id,
            'status' => 'pending',
            'requested_by' => Auth::id(),
            'requested_at' => now(),
            'metadata' => [
                'adjustment_number' => $adjustment->adjustment_number,
                'product_id' => $adjustment->product_id,
                'difference' => $adjustment->adjustment_difference,
                'reason' => $adjustment->reason,
            ],
        ]);
    }

    /**
     * Get approvers for a department
     */
    protected function getApprovers($departmentId): array
    {
        $approvers = [];

        // Find department manager
        $manager = \App\Models\User::where('department_id', $departmentId)
            ->where('is_supervisor', true)
            ->where('is_active', true)
            ->first();

        if ($manager) {
            $approvers['manager'] = $manager->id;
        }

        // Find admin as fallback
        $admin = \App\Models\User::where('is_admin', true)
            ->where('is_active', true)
            ->first();

        if ($admin) {
            $approvers['admin'] = $admin->id;
        }

        return $approvers;
    }

    /**
     * Notify approvers
     */
    protected function notifyApprovers(ProductAdjustment $adjustment)
    {
        $approvers = $this->getApprovers($adjustment->department_id);
        
        foreach ($approvers as $role => $userId) {
            $user = \App\Models\User::find($userId);
            if ($user) {
                Notification::send($user, new StockAdjustmentNotification(
                    $adjustment,
                    'needs_approval',
                    Auth::user()->name
                ));
            }
        }
    }

    /**
     * Approve an adjustment (Admin/Supervisor)
     */
    public function approveAdjustment($adjustmentId, Request $request)
    {
        try {
            $adjustment = ProductAdjustment::findOrFail($adjustmentId);
            
            // Check if user can approve
            $user = Auth::user();
            if (!$user->is_supervisor && !$user->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not authorized to approve this adjustment',
                ], 403);
            }

            // Check if adjustment is pending
            if ($adjustment->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This adjustment is no longer pending',
                ], 422);
            }

            DB::beginTransaction();

            // Update approval
            $approval = Approval::where('approvable_type', get_class($adjustment))
                ->where('approvable_id', $adjustment->id)
                ->first();

            if ($approval) {
                $approval->status = 'approved';
                $approval->approver_id = Auth::id();
                $approval->approved_at = now();
                $approval->save();
            }

            // Apply the adjustment
            $this->applyAdjustment($adjustment);

            // Update approval status in adjustment
            $adjustment->approved_by = Auth::id();
            $adjustment->approved_at = now();
            $adjustment->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Adjustment approved successfully',
                'data' => $adjustment
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject an adjustment (Admin/Supervisor)
     */
    public function rejectAdjustment($adjustmentId, Request $request)
    {
        try {
            $request->validate([
                'reason' => 'required|string|min:3',
            ]);

            $adjustment = ProductAdjustment::findOrFail($adjustmentId);
            
            // Check if user can reject
            $user = Auth::user();
            if (!$user->is_supervisor && !$user->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not authorized to reject this adjustment',
                ], 403);
            }

            // Check if adjustment is pending
            if ($adjustment->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This adjustment is no longer pending',
                ], 422);
            }

            DB::beginTransaction();

            // Update approval
            $approval = Approval::where('approvable_type', get_class($adjustment))
                ->where('approvable_id', $adjustment->id)
                ->first();

            if ($approval) {
                $approval->status = 'rejected';
                $approval->approver_id = Auth::id();
                $approval->approved_at = now();
                $approval->notes = $request->reason;
                $approval->save();
            }

            // Update adjustment
            $adjustment->status = 'rejected';
            $adjustment->rejected_by = Auth::id();
            $adjustment->rejected_at = now();
            $adjustment->rejection_reason = $request->reason;
            $adjustment->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Adjustment rejected',
                'data' => $adjustment
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}