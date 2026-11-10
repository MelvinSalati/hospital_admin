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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Models\Services\Service;

class ProductController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    public function addService(Request $request)
    {
        $validated = $request->validate([
            'user'                    => 'required|integer|exists:users,id',
            'rows'                    => 'required|array|min:1|max:2',
            'rows.*.commodity_id'     => 'required|integer|exists:products,id',
            'rows.*.scheme_type'      => ['required', 'integer', Rule::in([1, 2])],
            'rows.*.service_name'     => 'required|string|max:255',
            'rows.*.service_code'     => 'nullable|string|max:100',
            'rows.*.service_category' => 'nullable|string|max:100',
            'rows.*.department_id'    => 'required|integer|exists:departments,id',
            'rows.*.description'      => 'nullable|string',
            'rows.*.price'            => 'required|numeric|min:0',
            'rows.*.is_active'        => 'boolean',
        ]);

        $commodityIds = collect($validated['rows'])->pluck('commodity_id')->unique();
        if ($commodityIds->count() !== 1) {
            return response()->json([
                'message' => 'All rows must belong to the same product.',
            ], 422);
        }

        $commodityId = $commodityIds->first();
        $product = Product::findOrFail($commodityId);

        $created = [];
        $updated = [];

        DB::transaction(function () use ($validated, $product, &$created, &$updated) {
            foreach ($validated['rows'] as $row) {
                $existing = Service::where('product_uuid', $product->product_uuid)
                    ->where('scheme_type', $row['scheme_type'])
                    ->first();

                $code = $row['service_code'] ?? null;

                if ($existing) {
                    $existing->update([
                        'department_id'    => $row['department_id'],
                        'service_name'     => $row['service_name'],
                        'service_category' => $row['service_category'] ?? null,
                        'service_code'     => $code,
                        'description'      => $row['description'] ?? null,
                        'price'            => $row['price'],
                        'is_active'        => $row['is_active'] ?? true,
                    ]);
                    $updated[] = $existing->id;
                } else {
                    $service = Service::create([
                        'scheme_type'      => $row['scheme_type'],
                        // 'commodity_id'  => $row['commodity_id'],   // ❌ column doesn't exist
                        'product_uuid'     => $product->product_uuid, // ✅ existing link
                        'service_uuid'     => (string) Str::uuid(),
                        'department_id'    => $row['department_id'],
                        'service_name'     => $row['service_name'],
                        'service_category' => $row['service_category'] ?? null,
                        'service_code'     => $code,
                        'description'      => $row['description'] ?? null,
                        'price'            => $row['price'],
                        'is_active'        => $row['is_active'] ?? true,
                    ]);
                    $created[] = $service->id;
                }
            }
        });

        $message = match (true) {
            count($created) === 2 => "{$product->product_name} added to services with cash & insurance prices.",
            count($created) === 1 && count($updated) === 1 => "{$product->product_name} updated — one price created, one updated.",
            count($updated) === 2 => "{$product->product_name} prices updated.",
            default => "{$product->product_name} saved to services.",
        };

        return response()->json([
            'message'  => $message,
            'created'  => $created,
            'updated'  => $updated,
            // filter by the real link, not commodity_id
            'services' => Service::where('product_uuid', $product->product_uuid)
                ->whereIn('scheme_type', [1, 2])
                ->get(),
        ]);
    }

    /**
     * Show products page with all product data
     */
    public function showProducts(Request $request)
    {
        Log::info('Showing products page', \Illuminate\Support\Facades\DB::table('categories')->get());
        return Inertia::render('bulkstore/products', [
            'products' => $this->productService->getProducts(),
            'categories' => \Illuminate\Support\Facades\DB::table('categories')->get(),
            'departments' => \App\Models\Departments\Department::all()
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

    public function adjustPrice(Request $request, int $productId)
    {
        $serviceDetails  = [
            'commodity_id'   => $productId,
            'insurance_price' => $request->insurance_price,
            'cash_price' => $request->cash_price
        ];
        $addPrice       =  $this->productService->addPrice($serviceDetails);
        if ($addPrice) {
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

        return $this->response($response['message'], $response['status']);
    }

    public function adjustedProducts()
    {
        return Inertia::render(
            'bulkstore/Adjustments',
            [
                'adjustments'  => $this->getAdjustedStock()
            ]
        );
    }
    /**
     * Get all products with their expiry information
     */
   public function getExpiry(Request $request)
{
    try {
        // ---------------------------------------------------------
        // 1. Batches with product info
        // ---------------------------------------------------------
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

        // ---------------------------------------------------------
        // 2. Supplier names
        // ---------------------------------------------------------
        $supplierIds = $batches->pluck('supplier_id')->filter()->unique()->toArray();
        $suppliers = [];
        if (!empty($supplierIds)) {
            $supplierColumns = DB::getSchemaBuilder()->getColumnListing('suppliers');
            $nameColumn = 'name';
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

        // ---------------------------------------------------------
        // 3. Ledger scope + latest ledger row per product (inline)
        // ---------------------------------------------------------
        $bulkStoreId  = $request->filled('bulk_store_id')  ? (int) $request->input('bulk_store_id')  : null;
        $departmentId = $request->filled('department_id')  ? (int) $request->input('department_id')  : null;

        $productIds = $batches->pluck('product_id')->unique()->values();

        $ledger = [];
        if ($productIds->isNotEmpty()) {
            // latest ledger_date per product within scope
            $latestDates = StockLedger::query()
                ->select('product_id', DB::raw('MAX(ledger_date) as max_date'))
                ->whereIn('product_id', $productIds)
                ->when($bulkStoreId,  fn($q) => $q->where('bulk_store_id', $bulkStoreId))
                ->when($departmentId, fn($q) => $q->where('department_id', $departmentId))
                ->groupBy('product_id');

            $ledgerRows = StockLedger::query()
                ->joinSub($latestDates, 'latest', function ($join) {
                    $join->on('stock_ledger.product_id', '=', 'latest.product_id')
                         ->on('stock_ledger.ledger_date', '=', 'latest.max_date');
                })
                ->when($bulkStoreId,  fn($q) => $q->where('stock_ledger.bulk_store_id', $bulkStoreId))
                ->when($departmentId, fn($q) => $q->where('stock_ledger.department_id', $departmentId))
                ->orderByDesc('stock_ledger.id')
                ->get()
                ->unique('product_id');

            foreach ($ledgerRows as $row) {
                $ledger[$row->product_id] = [
                    'closing_balance' => (int) $row->closing_balance,
                    'avg_unit_cost'   => (float) $row->avg_unit_cost,
                    'updated_at'      => $row->updated_at,
                ];
            }
        }

        // total batch qty per product (reconciliation)
        $batchTotals = DB::table('stock_batches')
            ->whereNull('deleted_at')
            ->whereIn('product_id', $productIds)
            ->groupBy('product_id')
            ->pluck(DB::raw('SUM(remaining_quantity)'), 'product_id')
            ->toArray();

        // ---------------------------------------------------------
        // 4. Transform
        // ---------------------------------------------------------
        $expiryItems = $batches->map(function ($batch) use ($suppliers, $ledger, $batchTotals) {
            $entry     = $ledger[$batch->product_id] ?? null;
            $ledgerQty = (int) ($entry['closing_balance'] ?? 0);
            $avgCost   = (float) ($entry['avg_unit_cost'] ?? 0);
            $batchSum  = (int) ($batchTotals[$batch->product_id] ?? 0);
            $batchQty  = (int) $batch->remaining_quantity;

            return [
                'id'                 => $batch->id,
                'product_id'         => $batch->product_id,
                'product_name'       => $batch->product_name ?? 'Unknown Product',
                'product_code'       => $batch->product_code ?? 'N/A',
                'batch_number'       => $batch->batch_number ?? 'N/A',
                'supplier_id'        => $batch->supplier_id,
                'supplier_name'      => $suppliers[$batch->supplier_id] ?? 'N/A',
                'remaining_quantity' => $batchQty,
                'unit_cost'          => $avgCost,
                'total_value'        => $avgCost * $batchQty,

                'ledger_stock'       => $ledgerQty,
                'batch_total'        => $batchSum,
                'batch_share'        => $ledgerQty > 0
                    ? round(($batchQty / $ledgerQty) * 100, 2)
                    : null,
                'reconciled'         => $batchSum === $ledgerQty,
                'ledger_diff'        => $batchSum - $ledgerQty,
                'ledger_synced_at'   => $entry['updated_at'] ?? null,

                'expiry_date'        => $batch->expiry_date,
                'days_until_expiry'  => $batch->days_remaining,
                'status'             => $batch->status,
                'created_at'         => $batch->created_at,
            ];
        });

        // ---------------------------------------------------------
        // 5. Summary
        // ---------------------------------------------------------
        $summary = [
            'total_products'      => $expiryItems->unique('product_id')->count(),
            'total_batches'       => $expiryItems->count(),
            'expired_batches'     => $expiryItems->where('status', 'expired')->count(),
            'critical_batches'    => $expiryItems->where('status', 'critical')->count(),
            'warning_batches'     => $expiryItems->where('status', 'warning')->count(),
            'ok_batches'          => $expiryItems->where('status', 'ok')->count(),
            'total_value'         => round($expiryItems->sum('total_value'), 2),
            'ledger_units'        => $expiryItems->unique('product_id')->sum('ledger_stock'),
            'batch_units'         => $expiryItems->unique('product_id')->sum('batch_total'),
            'mismatched_products' => $expiryItems->where('reconciled', false)
                ->unique('product_id')->count(),
        ];

        // ---------------------------------------------------------
        // 6. Filters
        // ---------------------------------------------------------
        $filteredItems = $expiryItems;

        if ($request->filled('search')) {
            $search = $request->search;
            $filteredItems = $filteredItems->filter(function ($item) use ($search) {
                return stripos($item['product_name'], $search) !== false
                    || stripos($item['product_code'], $search) !== false
                    || stripos($item['batch_number'], $search) !== false
                    || stripos($item['supplier_name'], $search) !== false;
            });
        }

        if ($request->filled('status')) {
            $filteredItems = $filteredItems->where('status', $request->status);
        }

        if ($request->boolean('mismatched_only')) {
            $filteredItems = $filteredItems->where('reconciled', false);
        }

        return Inertia::render('bulkstore/Expiry', [
            'expiryItems' => $filteredItems->values()->all(),
            'summary'     => $summary,
            'filters'     => [
                'search'          => $request->search,
                'status'          => $request->status,
                'bulk_store_id'   => $bulkStoreId,
                'department_id'   => $departmentId,
                'mismatched_only' => $request->boolean('mismatched_only'),
            ],
        ]);
    } catch (\Exception $e) {
        \Log::error('Bulk store expiry error: ' . $e->getMessage());
        \Log::error($e->getTraceAsString());

        return Inertia::render('bulkstore/Expiry', [
            'expiryItems' => [],
            'summary'     => null,
            'error'       => 'Failed to load expiry data: ' . $e->getMessage(),
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

    public function addProduct(Request $request)
    {
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
    public function getProductInStock($barcode)
    {
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
        ).rand(000,999);
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
        ).rand(000,999);
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
    public function getAdjustedStock()
{
    return $this->productService->getAdjustedStock();
}

    /**
     * Stock Adjustment - Handles both draft and approval workflow
     */
   public function stockAdjustment(Request $request)
{
    $validated = $request->validate([
        'product_id' => 'required|exists:products,id',
        'quantity' => 'required|integer|min:0',
        'reason' => 'required|string|min:10',
        'adjustment_type' => 'required|in:addition,reduction',
        'adjustment_category' => 'required|in:correction,damage,expiry,shortage,surplus,quality_issue',
        'evidence' => 'nullable|array',
        'evidence.*' => 'string',
        'created_by' => 'required|exists:users,id',
        'batch_number' => 'nullable|string',
        'expiry_date' => 'nullable|date',
        'unit_cost' => 'nullable|numeric|min:0',
        'department_id' => 'nullable|exists:departments,id',
        'bulk_store_id' => 'nullable|exists:bulk_stores,id',
    ]);

    try {
        $adjustment = DB::transaction(function () use ($validated) {

            // Validate the direction and quantity.
          $difference = $validated['adjustment_type'] === 'addition'
    ?  abs((int) $validated['quantity'])
    : -abs((int) $validated['quantity']);

if (abs($difference) !== (int) $validated['quantity']) {
    throw new \InvalidArgumentException(
        'Adjustment quantity must match the absolute difference.'
    );
}

            if (abs($difference) !== (int) $validated['quantity']) {
                throw new \InvalidArgumentException(
                    'Adjustment quantity must match the absolute difference.'
                );
            }
            $requiresApproval = $difference < 0;

            // Retrieve the current balance from the correct ledger scope.
            $balance = $this->getCurrentStockBalance(
                $validated['product_id'],
                $validated['department_id'] ?? null,
                $validated['bulk_store_id'] ?? null
            );

            $adjustment = \App\Models\Bulkstores\ProductAdjustment::create([
                'adjustment_uuid' => (string) \Illuminate\Support\Str::uuid(),
                'adjustment_number' => $this->generateAdjustmentNumber(),
                'product_id' => $validated['product_id'],
                'department_id' => $validated['department_id'] ?? null,
                'bulk_store_id' => $validated['bulk_store_id'] ?? null,
                'current_stock' => $balance,
                'proposed_quantity' => $validated['quantity'],
                'adjustment_difference' => $difference,
                'adjustment_type' => $validated['adjustment_type'],
                'category' => $validated['adjustment_category'],
                'batch_number' => $validated['batch_number'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'unit_cost' => $validated['unit_cost'] ?? null,
                'reason' => $validated['reason'],
                'evidence' => $validated['evidence'] ?? null,
                'status' => $requiresApproval ? 'pending' : 'draft',
                'approval_required' => $requiresApproval,
                'created_by' => $validated['created_by'],
                'requested_by' => $validated['created_by'],
                'requested_at' => now(),
            ]);

            if ($requiresApproval) {
                $approval = $this->createApprovalRecord($adjustment);

                StockAdjustmentJob::dispatch([
                    'adjustment_id' => $adjustment->id,
                    'approval_id' => $approval->id,
                    'action' => 'pending_approval',
                    'user_id' => Auth::id(),
                    'notify_approvers' => true,
                ])->afterCommit();

                return [
                    'adjustment' => $adjustment,
                    'approval' => $approval,
                ];
            }

            // Positive adjustments are applied immediately.
            $this->applyAdjustment($adjustment);

            return [
                'adjustment' => $adjustment->fresh(),
                'approval' => null,
            ];
        });

        // Notifications are dispatched after the database transaction.
        if ($adjustment['approval']) {
            $this->notifyApprovers($adjustment['adjustment']);
        }

        return response()->json([
            'success' => true,
            'message' => $adjustment['approval']
                ? 'Stock adjustment submitted for approval.'
                : 'Stock adjustment applied successfully.',
            'requires_approval' => (bool) $adjustment['approval'],
            'data' => $adjustment,
        ]);

    } catch (\Illuminate\Validation\ValidationException $e) {
        throw $e;

    } catch (\Throwable $e) {
        \Log::error('Stock adjustment failed', [
            'error' => $e->getMessage(),
            'user_id' => Auth::id(),
        ]);

        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
        ], $e instanceof \InvalidArgumentException ? 422 : 500);
    }
}
protected function applyAdjustment(ProductAdjustment $adjustment): void
{
    // Opening balance = last ledger closing for this product + bulk store
    $lastLedger = StockLedger::where('product_id', $adjustment->product_id)
        ->where('bulk_store_id', $adjustment->bulk_store_id)
        ->orderByDesc('ledger_date')
        ->orderByDesc('id')
        ->lockForUpdate()
        ->first();

    $openingBalance = (int) ($lastLedger?->closing_balance ?? 0);
    $delta          = (int) $adjustment->adjustment_difference; // signed
    $closingBalance = $openingBalance + $delta;

    // Ledger row
    StockLedger::create([
        'ledger_uuid'      => (string) Str::uuid(),
        'department_id'    => 1,
        'bulk_store_id'    => $adjustment->bulk_store_id,
        'product_id'       => $adjustment->product_id,
        'ledger_date'      => now()->toDateString(),
        'opening_balance'  => $openingBalance,
        'total_in'         => $delta > 0 ? $delta : 0,
        'total_out'        => $delta < 0 ? abs($delta) : 0,
        'closing_balance'  => $closingBalance,
        'adjustments_in'   => $delta > 0 ? $delta : 0,
        'adjustments_out'  => $delta < 0 ? abs($delta) : 0,
        'purchases_in'     => 0,
        'returns_in'       => 0,
        'transfers_in'     => 0,
        'sales_out'        => 0,
        'damage_out'       => 0,
        'expiry_out'       => 0,
        'transfers_out'    => 0,
        'returns_out'      => 0,
        'movement_count'   => 1,
        'unique_batches'   => $adjustment->batch_number ? 1 : 0,
        'avg_unit_cost'    => $adjustment->unit_cost ?? 0,
        'batch_number'     => $adjustment->batch_number,
        'created_by'       => Auth::id(),
        'updated_by'       => Auth::id(),
        'is_verified'      => 1,
        'verified_at'      => now(),
        'verified_by'      => Auth::id(),
        'notes'            => "Adjustment {$adjustment->adjustment_number}: {$adjustment->reason}",
    ]);

    // Mark adjustment applied
    $adjustment->update([
        'status'      => 'approved',
        'approved_by' => Auth::id(),
        'approved_at' => now(),
    ]);
}
protected function getCurrentStockBalance(
    int $productId,
    ?int $departmentId = null,
    ?int $bulkStoreId = null
): int {
    // Bulk-store-only app: department path kept just for safety
    $query = StockLedger::where('product_id', $productId);

    // if ($bulkStoreId) {
    //     $query->where('bulk_store_id', 12);
    // } elseif ($departmentId) {
    //     $query->where('department_id', 12);
    // } else {
    //     throw new \InvalidArgumentException(
    //         'A department or bulk store must be specified.'
    //     );
    // }

    return (int) ($query
        ->orderByDesc('ledger_date')
        ->orderByDesc('id')
        ->value('closing_balance') ?? 0);
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
        $manager = User::join('users','users.id','=','user_profiles.user_id')
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
        try {
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
        } catch (\Exception $e) {
            Log::info('issues with notifying', [$e->getMessage()]);
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

    private function response(string $message, int $status)
    {
        return response()->json([
            'message' => $message
        ], $status);
    }
}
