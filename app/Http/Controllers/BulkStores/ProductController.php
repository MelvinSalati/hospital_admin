<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\BulkStores\ProductService;
use App\Models\BulkStores\Product;
use App\Models\BulkStores\StockLedger;
use App\Models\Bulkstores\ProductAdjustment;
use App\Models\User;
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
     * Show products page with all product data
     */
    public function showProducts(Request $request)
    {
        return Inertia::render('bulkstore/Products', [
            'products' => $this->productService->getProducts()
        ]);
    }

    /**
     *  Returns all products with stock availability
     *  in order to fix pricing
     */

     public function getStockPricing(Request $request)
    {
        return Inertia::render('bulkstore/StockPricing', [
            'products' => $this->productService->getProductsWithStock()
        ]);
    }

    public function adjustPrice(Request $request, int $productId){
        $serviceDetails  = [
            'commodity_id'   => $productId,
            'insurance_price' => $request->insurance_price,
            'cash_price' => $request->cash_price
        ];
        $addPrice       =  $this->productService->addPrice($serviceDetails);
        if($addPrice){
            $response = [
                'message' => 'Commodity pricing added succesfully!',
                'status'  => 200
            ];
        } else {
                $response = [
                'message' => 'Commodity Pricing Failed!',
                'status'  => 500
            ];
        }  

        return $this->response($response['message'],$response['status']);
    }

    public function adjustedProducts(){
        return Inertia::render('bulkstore/Expiry',
        [
            'adjustments'  => $this->getAdjustedStock()
        ]);
    }
    /**
     * Get all products with their expiry information
     */
    public function getExpiry(Request $request)
    {
        try {
            // Query batches with product information
            $batches = DB::table('stock_batches')
                ->join('products', 'stock_batches.product_id', '=', 'products.id')
                ->whereNull('stock_batches.deleted_at')
                ->where('stock_batches.remaining_quantity', '>', 0)
                ->select([
                    'stock_batches.id',
                    'stock_batches.product_id',
                    'stock_batches.batch_number',
                    'stock_batches.supplier_id',
                    'stock_batches.remaining_quantity',
                    'stock_batches.expiry_date',
                    'stock_batches.created_at',
                    'products.product_name',
                    'products.product_code',
                    DB::raw('DATEDIFF(stock_batches.expiry_date, CURDATE()) AS days_remaining'),
                    DB::raw("
                        CASE
                            WHEN stock_batches.expiry_date < CURDATE() THEN 'expired'
                            WHEN DATEDIFF(stock_batches.expiry_date, CURDATE()) < 30 THEN 'critical'
                            WHEN DATEDIFF(stock_batches.expiry_date, CURDATE()) < 90 THEN 'warning'
                            ELSE 'ok'
                        END AS status
                    ")
                ])
                ->orderBy('stock_batches.expiry_date', 'asc')
                ->get();

            // Get supplier names separately
            $supplierIds = $batches->pluck('supplier_id')->filter()->unique()->toArray();
            $suppliers = [];
            if (!empty($supplierIds)) {
                // Get the column names from suppliers table
                $supplierColumns = DB::getSchemaBuilder()->getColumnListing('suppliers');
                $nameColumn = 'name'; // default
                foreach (['name', 'supplier_name', 'company_name', 'company', 'business_name'] as $col) {
                    if (in_array($col, $supplierColumns)) {
                        $nameColumn = $col;
                        break;
                    }
                }

                $supplierData = DB::table('suppliers')
                    ->whereIn('id', $supplierIds)
                    ->select('id', $nameColumn . ' as name')
                    ->get();

                foreach ($supplierData as $supplier) {
                    $suppliers[$supplier->id] = $supplier->name;
                }
            }

            // Transform the data (without unit cost)
            $expiryItems = $batches->map(function ($batch) use ($suppliers) {
                return [
                    'id' => $batch->id,
                    'product_id' => $batch->product_id,
                    'product_name' => $batch->product_name ?? 'Unknown Product',
                    'product_code' => $batch->product_code ?? 'N/A',
                    'batch_number' => $batch->batch_number ?? 'N/A',
                    'supplier_id' => $batch->supplier_id,
                    'supplier_name' => $suppliers[$batch->supplier_id] ?? 'N/A',
                    'remaining_quantity' => $batch->remaining_quantity,
                    'unit_cost' => 0, // Set to 0 since we can't get it
                    'total_value' => 0, // Set to 0 since we can't get it
                    'expiry_date' => $batch->expiry_date,
                    'days_until_expiry' => $batch->days_remaining,
                    'status' => $batch->status,
                    'created_at' => $batch->created_at,
                ];
            });

            // Calculate summary statistics
            $summary = [
                'total_products' => $expiryItems->unique('product_id')->count(),
                'total_batches' => $expiryItems->count(),
                'expired_batches' => $expiryItems->where('status', 'expired')->count(),
                'critical_batches' => $expiryItems->where('status', 'critical')->count(),
                'warning_batches' => $expiryItems->where('status', 'warning')->count(),
                'ok_batches' => $expiryItems->where('status', 'ok')->count(),
                'total_value' => 0, // Set to 0 since we can't get it
            ];

            // Apply filters
            $filteredItems = $expiryItems;
            if ($request->filled('search')) {
                $search = $request->search;
                $filteredItems = $filteredItems->filter(function ($item) use ($search) {
                    return stripos($item['product_name'], $search) !== false ||
                        stripos($item['product_code'], $search) !== false ||
                        stripos($item['batch_number'], $search) !== false ||
                        stripos($item['supplier_name'], $search) !== false;
                });
            }

            if ($request->filled('status')) {
                $status = $request->status;
                $filteredItems = $filteredItems->where('status', $status);
            }

            return Inertia::render('bulkstore/Expiry', [
                'expiryItems' => $filteredItems->values()->all(),
                'summary' => $summary,
                'filters' => [
                    'search' => $request->search,
                    'status' => $request->status,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Bulk store expiry error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());

            return Inertia::render('bulkstore/Expiry', [
                'expiryItems' => [],
                'summary' => null,
                'error' => 'Failed to load expiry data: ' . $e->getMessage()
            ]);
        }
    }
    public function showDetails(string $uuid)
    {
        try {
            $product = Product::with(['batches' => function ($query) {
                $query
                    ->whereNull('deleted_at')
                    ->where('remaining_quantity', '>', 0)
                    ->orderBy('expiry_date', 'asc')
                    ->select([
                        'id',
                        'product_id',
                        'batch_number',
                        'expiry_date',
                        'remaining_quantity',
                        \DB::raw('DATEDIFF(expiry_date, CURDATE()) AS days_remaining'),
                        \DB::raw("
                        CASE
                            WHEN expiry_date < CURDATE() THEN 'EXPIRED'
                            WHEN DATEDIFF(expiry_date, CURDATE()) < 30 THEN 'CRITICAL'
                            WHEN DATEDIFF(expiry_date, CURDATE()) < 90 THEN 'WARNING'
                            WHEN DATEDIFF(expiry_date, CURDATE()) < 180 THEN 'UPCOMING'
                            ELSE 'NORMAL'
                        END AS expiry_status
                    ")
                    ]);
            }])
                ->where('product_uuid', $uuid)
                ->firstOrFail();

            return response()->json($product);
        } catch (\Exception $e) {
            \Log::error('Product details error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Product not found',
                'message' => $e->getMessage()
            ], 404);
        }
    }

    public function addProduct(Request $request){
        $productDetails = [
            'product_uuid' => \Illuminate\Support\Str::uuid(),
            'product_name' => $request->input('product_name'),
            'generic_name' => $request->input('generic_name'),
            'product_code' => $request->input('product_code'),
            'barcode' => $request->input('barcode') ?: $request->input('product_code'),
            'category_id' => $request->input('category_id'),
            'unit' => $request->input('unit'),
            'description' => $request->input('description'),
            'is_active' => true,
            'brand_name' => $request->input('brand_name'),
            'therapeutic_class' => $request->input('therapeutic_class'),
            'schedule_class' => $request->input('schedule_class'),
            'strength' => $request->input('strength'),
            'form' => $request->input('dosage_form'),
            'route_of_administration' => $request->input('route_of_administration'),
            'pack_size' => $request->input('pack_size'),
            'reorder_level' => $request->input('reorder_level'),
            'is_arv' => $request->boolean('is_arv'),
            'is_tb_drug' => $request->boolean('is_tb_drug'),
            'is_emergency' => $request->boolean('is_emergency'),
            'is_controlled' => $request->boolean('is_controlled'),
            'track_batches' => $request->boolean('track_batches'),
            'track_expiry' => $request->boolean('track_expiry'),
            'allow_negative_stock' => $request->boolean('allow_negative_stock'),
        ];

        $create  =  $this->productService->addProduct($productDetails);
       if ($create) {
        $response = [
            'message' => 'Product added successfully',
            'status'  => 200
        ];
        } else {
            $response = [
                'message' => 'Product added failed!',  // ✅ Use comma
                'status'  => 500
            ];
        }

        /**
         * Extract message
         * $extrac status
         */

        $message  =  $response['message'];
        $status   =  $response['status'];

        return $this->response($message, $status);

    }
    /**
     * fetch product in stock based on search params
     */
    public function getProductInStock($barcode){
        return $this->productService->getProduct($barcode);
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
            'adjustment_number' => $this->generateAdjustmentNumber(),
            'product_id' => $validated['product_id'],
            'current_stock' => $validated['previous_quantity'] ?? 0,  // ✅ Fixed: added closing parenthesis
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
            'created_by' => $request->created_by ?? auth()->id(),
            'requested_by' => $request->created_by ?? auth()->id(),
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

public function getAdjustedStock(){
    return $this->productService->getAdjustedStock();
}
protected function applyAdjustment(ProductAdjustment $adjustment)
{
    DB::transaction(function () use ($adjustment) {
        // Get the product (no stock field needed)
        $product = Product::find($adjustment->product_id);

        // Get the current stock balance from ledger
        $balanceBefore = $this->getCurrentStockBalance($adjustment->product_id);
        $balanceAfter = $balanceBefore + $adjustment->adjustment_difference;
        $quantity = abs($adjustment->adjustment_difference);

        $user      = User::findOrFail($adjustment->created_by);

        // Validate the adjustment won't make stock negative
        if ($balanceAfter < 0) {
            throw new \Exception("Insufficient stock. Current balance: {$balanceBefore}, Adjustment: {$adjustment->adjustment_difference}");
        }

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
            'quantity' => $quantity,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'reference_number' => $adjustment->adjustment_number,
            'batch_number' => $adjustment->batch_number,
            'expiry_date' => $adjustment->expiry_date,
            'unit_cost' => $adjustment->unit_cost,
            'remarks' => "Applied from adjustment #{$adjustment->adjustment_number}: {$adjustment->reason}",
            'moved_at' => now(),
        ]);

        // ✅ Update Stock Ledger (source of truth)
        $this->updateStockLedger($product, $adjustment, $movement, $balanceBefore, $balanceAfter);

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
                $user->name
            ));
        }
    });
}

/**
 * Get current stock balance from ledger
 */
protected function getCurrentStockBalance($productId)
{
    $lastLedger = StockLedger::where('product_id', $productId)
        ->orderBy('created_at', 'desc')
        ->orderBy('id', 'desc')
        ->first();

    return $lastLedger ? $lastLedger->balance_after : 0;
}

/**
 * Update stock ledger with running balance
 */
protected function updateStockLedger($product, $adjustment, $movement, $balanceBefore, $balanceAfter)
{
    $quantityChange = $adjustment->adjustment_difference;
    $movementType = $quantityChange > 0 ? 'in' : 'out';

    // Create ledger entry
    StockLedger::create([
        'product_id' => $product->id,
        'stock_movement_id' => $movement->id,
        'reference_number' => $adjustment->adjustment_number,
        'movement_type' => $movementType,
        'quantity_change' => $quantityChange,
        'balance_before' => $balanceBefore,
        'balance_after' => $balanceAfter,
        'unit_cost' => $adjustment->unit_cost,
        'total_value' => $balanceAfter * $adjustment->unit_cost,
        'department_id' => 1,
        'ledger_date'  => \Carbon\Carbon::now(),
        'batch_number' => $adjustment->batch_number,
        'expiry_date' => $adjustment->expiry_date,
        'created_by' => Auth::id(),
        'remarks' => "Stock adjustment: {$adjustment->reason}"
    ]);
}

/**
 * Update stock ledger with running balance
 */
// protected function updateStockLedger($product, $adjustment, $movement, $balanceBefore, $balanceAfter)
// {
//     // Get the last ledger entry for this product
//     $lastLedger = StockLedger::where('product_id', $product->id)
//         ->orderBy('entry_date', 'desc')
//         ->orderBy('id', 'desc')
//         ->first();

//     // Determine if this is an addition or deduction
//     $quantityChange = $adjustment->adjustment_difference;
//     $movementType = $quantityChange > 0 ? 'in' : 'out';

//     // Create ledger entry
//     StockLedger::create([
//         'product_id' => $product->id,
//         'stock_movement_id' => $movement->id,
//         'reference_number' => $adjustment->adjustment_number,
//         'entry_date' => now(),
//         'movement_type' => $movementType,
//         'quantity_change' => $quantityChange,
//         'balance_before' => $balanceBefore,
//         'balance_after' => $balanceAfter,
//         'unit_cost' => $adjustment->unit_cost,
//         'total_value' => $balanceAfter * $adjustment->unit_cost,
//         'department_id' => $adjustment->department_id,
//         'batch_number' => $adjustment->batch_number,
//         'expiry_date' => $adjustment->expiry_date,
//         'created_by' => Auth::id(),
//         'remarks' => "Stock adjustment: {$adjustment->reason}"
//     ]);

//     // Optionally: Update product average cost
//     if ($movementType === 'in') {
//         $this->updateAverageCost($product, $adjustment->unit_cost, $quantityChange);
//     }
// }

/**
 * Update weighted average cost
 */
protected function updateAverageCost($product, $newUnitCost, $quantityAdded)
{
    $totalValue = ($product->current_stock * $product->average_unit_cost) + ($quantityAdded * $newUnitCost);
    $totalQuantity = $product->current_stock + $quantityAdded;

    if ($totalQuantity > 0) {
        $product->average_unit_cost = $totalValue / $totalQuantity;
        $product->save();
    }
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
        $manager = User::where('department_id', $departmentId)
            ->where('is_supervisor', true)
            ->where('is_active', true)
            ->first();

        if ($manager) {
            $approvers['manager'] = $manager->id;
        }

        // Find admin as fallback
        $admin = User::where('is_admin', true)
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
        try{
            $approvers = $this->getApprovers($adjustment->department_id);

        foreach ($approvers as $role => $userId) {
            $user = User::find($userId);
            if ($user) {
                Notification::send($user, new StockAdjustmentNotification(
                    $adjustment,
                    'needs_approval',
                    Auth::user()->name
                ));
            }
        }
        } catch(\Exception $e){
            Log::info('issues with notifying',[$e->getMessage()]);
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

    private function response(string $message, int $status){
        return response()->json([
            'message' => $message
        ],$status);
    }
}

