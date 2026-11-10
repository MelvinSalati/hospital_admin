<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStores\StoreBulkStoreRequest;
use App\Http\Requests\BulkStores\UpdateBulkStoreRequest;
use App\Models\BulkStores\BulkStore;
use App\Dashboards\BulkStores\Metrics;
use Illuminate\Support\Str;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Supplier;
use App\Models\BulkStores\Product;
use App\Models\BulkStores\PurchaseRequisition;
use App\Models\Department;
use App\Models\BulkStores\DepartmentRequisition;
use App\Models\BulkStores\DepartmentRequisitionItem;
use App\Http\Requests\BulkStores\IssueStockRequest;
use App\Services\BulkStores\ProductIssueService;
use Illuminate\Support\Facades\DB;
use App\Models\Product\Category;
use Carbon\Carbon;

class BulkStoreController extends Controller
{
    /**
     * Display the dashboard with real data
     * GET /bulk-stores/dashboard
     */
    public function index(Request $request)
    {
        // Get period from request
        $period = $request->only(['begin', 'end']);

        // Instantiate the dashboard class - FIXED: Use BukkStore
        $dashboard = new Metrics($period);
        $metrics = $dashboard->dashboardMetrics();

        // Format data for the React component
        $dashboardData = $this->formatDashboardData($metrics);

        return Inertia::render('bulkstore/Dashboard', [
            'dashboardData' => $dashboardData,
        ]);
    }

    /**
     * Format dashboard data for React component
     */
    private function formatDashboardData($metrics)
    {
        return [
            'stats' => $this->getStats($metrics),
            'monthlySummary' => $this->getMonthlySummary($metrics),
            'topProducts' => $this->getTopProducts(),
            'departmentData' => $this->getDepartmentConsumption(),
            'recentTransactions' => $this->getRecentTransactions(),
            'pendingActions' => $this->getPendingActions(),
            'dateRange' => $metrics['period'] ?? 'This Month',
        ];
    }

    /**
     * Get statistics for the dashboard
     */
    private function getStats($metrics)
    {
        return [
            'totalProducts' => Product::count(),
            'totalStockValue' => PurchaseRequisition::with('item.products')->where('status', 'approved')
                ->sum('estimated_total'),
            // 'totalStockValue' => Product::sum('unit_cost') ?? 0,
            // 'totalQuantityAvailable' => 0 ?? 0,
            // 'lowStockItems' => 0,
            // 'outOfStockItems' => Product::where('quantity', 0)->count(),
            // 'overstockItems' => Product::where('quantity', '>', 500)->count(),
            // 'nearExpiryItems' => Product::whereBetween('expiry_date', [
            //     Carbon::now()->format('Y-m-d'),
            //     Carbon::now()->addDays(30)->format('Y-m-d')
            // ])->count(),
            // 'expiredItems' => Product::where('expiry_date', '<', Carbon::now())->count(),
            // 'stockReceivedToday' => PurchaseRequisition::whereDate('created_at', Carbon::today())
            //     ->where('status', 'received')
            //     ->sum('estimated_total'),
            // 'stockIssuedToday' => PurchaseRequisition::whereDate('created_at', Carbon::today())
            //     ->where('status', 'issued')
            //     ->sum('estimated_total'),
            // 'adjustmentsToday' => PurchaseRequisition::whereDate('created_at', Carbon::today())
            //     ->where('status', 'adjusted')
            //     ->sum('estimated_total'),
            // 'returnsToday' => PurchaseRequisition::whereDate('created_at', Carbon::today())
            //     ->where('status', 'returned')
            //     ->sum('estimated_total'),
            // 'pendingOrders' => PurchaseRequisition::where('status', 'pending')->count(),
            // 'completedOrders' => PurchaseRequisition::where('status', 'received')->count(),
            // 'departmentsServed' => Department::count(),
            // 'pendingRequests' => PurchaseRequisition::where('status', 'pending_approval')->count(),
            // 'monthlyConsumption' => $metrics['metrics']['consumption'] ?? 0,
            // 'monthlyReceived' => $metrics['metrics']['received'] ?? 0,
            // 'monthlyAdjustments' => $metrics['metrics']['adjustments'] ?? 0,
            // 'monthlyReturns' => $metrics['metrics']['returns'] ?? 0,
        ];
    }

    /**
     * Get monthly summary data
     */
    private function getMonthlySummary($metrics)
    {
        $data = $metrics['metrics'] ?? [];

        // Get last month's data for comparison
        $lastMonthConsumption = PurchaseRequisition::whereMonth('created_at', Carbon::now()->subMonth()->month)
            ->where('status', 'issued')
            ->sum('estimated_total');

        $lastMonthReceived = PurchaseRequisition::whereMonth('created_at', Carbon::now()->subMonth()->month)
            ->where('status', 'received')
            ->sum('estimated_total');

        $currentConsumption = $data['consumption'] ?? 0;
        $currentReceived = $data['received'] ?? 0;

        return [
            [
                'metric' => 'Consumption',
                'value' => $currentConsumption,
                'change' => $this->calculatePercentageChange($currentConsumption, $lastMonthConsumption),
                'color' => '#3b82f6'
            ],
            [
                'metric' => 'Received',
                'value' => $currentReceived,
                'change' => $this->calculatePercentageChange($currentReceived, $lastMonthReceived),
                'color' => '#22c55e'
            ],
            [
                'metric' => 'Adjustments',
                'value' => $data['adjustments'] ?? 0,
                'change' => -5,
                'color' => '#f59e0b'
            ],
            [
                'metric' => 'Returns',
                'value' => $data['returns'] ?? 0,
                'change' => -3,
                'color' => '#ef4444'
            ],
        ];
    }

    /**
     * Get top consumed products
     */
    private function getTopProducts()
    {
        // Get products with most issued quantities
        // $products = Product::withCount(['requisitionItems as total_issued' => function($query) {
        //         $query->whereHas('requisition', function($q) {
        //             $q->where('status', 'issued')
        //                 ->whereMonth('created_at', Carbon::now()->month);
        //         });
        //     }])
        //     ->orderBy('total_issued', 'desc')
        //     ->limit(5)
        //     ->get();

        // // Get max issued for percentage calculation
        // $maxIssued = $products->max('total_issued') ?: 1;

        // return $products->map(function($product) use ($maxIssued) {
        //     $total = $product->total_issued ?? 0;
        //     return [
        //         'name' => $product->product_name,
        //         'quantity' => $total,
        //         'percentage' => round(($total / $maxIssued) * 100, 1),
        //     ];
        // })->toArray();
    }

    /**
     * Get department consumption data
     */
    private function getDepartmentConsumption()
    {
        // return Department::withCount(['requisitions as consumption' => function($query) {
        //         $query->where('status', 'issued')
        //             ->whereMonth('created_at', Carbon::now()->month);
        //     }])
        //     ->orderBy('consumption', 'desc')
        //     ->limit(5)
        //     ->get()
        //     ->map(function($department) {
        //         return [
        //             'department' => $department->name,
        //             'consumption' => $department->consumption ?? 0,
        //         ];
        //     })
        //     ->toArray();
    }

    /**
     * Get recent transactions
     */
    private function getRecentTransactions()
    {
        // return PurchaseRequisition::with(['requisitionItem.product'])
        // ->whereIn('status', ['received', 'issued', 'adjusted', 'returned'])
        // ->latest()
        // ->limit(5)
        // ->get()
        // ->map(function($transaction) {
        //     $type = ucfirst($transaction->status);
        //     $quantity = $transaction->requisitionItem->sum('quantity') ?? 0;

        //     return [
        //         'date' => $transaction->created_at->diffForHumans(),
        //         'product' => $transaction->requisitionItem->first()->product->product_name ?? 'Unknown Product',
        //         'type' => $type,
        //         'quantity' => $quantity,
        //         'status' => in_array($transaction->status, ['received', 'issued']) ? 'completed' : 'pending',
        //     ];
        // })
        // ->toArray();
    }

    /**
     * Get pending actions
     */
    private function getPendingActions()
    {
        return [
            [
                'action' => 'Approve Requests',
                'count' => PurchaseRequisition::where('status', 'pending_approval')->count(),
                'priority' => 'high',
                'icon' => 'Clock'
            ],
            [
                'action' => 'Receive Orders',
                'count' => PurchaseRequisition::where('status', 'pending_receipt')->count(),
                'priority' => 'medium',
                'icon' => 'Truck'
            ],
            [
                'action' => 'Stock Adjustments',
                'count' => PurchaseRequisition::where('status', 'pending_adjustment')->count(),
                'priority' => 'medium',
                'icon' => 'AlertTriangle'
            ],
            [
                'action' => 'Expiry Review',
                'count' => 1,
                'priority' => 'low',
                'icon' => 'Calendar'
            ],
        ];
    }

    /**
     * Calculate percentage change between two values
     */
    private function calculatePercentageChange($current, $previous)
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * Display orders page
     */
    public function orders()
    {
        return Inertia::render('bulkstore/orders', [
            'orders' => [],
        ]);
    }

    /**
     * Display issues page
     */
    public function departmentalRequest()
    {
        $departmentalRequests =  DepartmentRequisition::join('department_requisition_items', 'department_requisitions.department_id', '=', 'department_requisition_items.department_requisition_id')
            ->get();
        return Inertia::render('bulkstore/issues', [
            'issues' => $departmentalRequests,
        ]);
    }

    public function departmentalRequests()
    {
        $rows = DepartmentRequisition::query()
            ->join(
                'department_requisition_items',
                'department_requisitions.id',
                '=',
                'department_requisition_items.department_requisition_id'
            )
            ->join('products', 'products.id', '=', 'department_requisition_items.product_id')
            ->join('departments', 'departments.id', '=', 'department_requisitions.department_id')
            ->leftJoin('users', 'users.id', '=', 'department_requisitions.requested_by')
            ->whereIn('department_requisitions.status', ['pending', 'approved', 'partially_fulfilled'])
            ->where('department_requisition_items.status', 'pending')
            ->select([
                // Header — what we group by
                'department_requisitions.id as requisition_id',
                'department_requisitions.requisition_number',
                'department_requisitions.priority',
                'department_requisitions.required_by_date',
                'department_requisitions.requested_at',
                'department_requisitions.requested_by',
                'users.name as requested_by_name',

                // Department
                'departments.id as department_id',
                'departments.name as department_name',
                'departments.code as department_code',

                // Item
                'department_requisition_items.id as item_id',
                'department_requisition_items.uuid',
                'department_requisition_items.product_id',
                'department_requisition_items.quantity_requested',
                'department_requisition_items.quantity_approved',
                'department_requisition_items.quantity_fulfilled',
                'department_requisition_items.quantity_rejected',
                'department_requisition_items.status',
                'department_requisition_items.issued_by',
                'department_requisition_items.created_at',
                'department_requisition_items.updated_at',

                // Product
                'products.product_name',
                'products.product_code',
                'products.unit',
                'products.category_id',
                'products.reorder_level',
            ])
            ->orderBy('department_requisitions.requested_at', 'desc')
            ->get();

        $grouped = $rows->groupBy('requisition_id')->map(function ($items) {
            $first = $items->first();

            return [
                'requisition_id'   => $first->requisition_id,
                'requisition_no'   => $first->requisition_number,
                'department_id'    => $first->department_id,
                'department_name'  => $first->department_name,
                'department_code'  => $first->department_code,
                'priority'         => $first->priority,
                'required_by'      => $first->required_by_date,
                'requested_at'     => $first->requested_at,
                'requested_by'     => $first->requested_by_name ?? 'N/A',
                'items'            => $items->map(fn($i) => [
                    'item_id'            => $i->item_id,
                    'product_id'         => $i->product_id,
                    'product_name'       => $i->product_name,
                    'product_code'       => $i->product_code,
                    'unit'               => $i->unit,
                    'quantity_requested' => (float) $i->quantity_requested,
                    'quantity_approved'  => (float) $i->quantity_approved,
                    'quantity_fulfilled' => (float) $i->quantity_fulfilled,
                    'quantity_rejected'  => (float) $i->quantity_rejected,
                ])->values(),
                'item_count'       => $items->count(),
                'requested_total'  => (float) $items->sum('quantity_requested'),
                'fulfilled_total'  => (float) $items->sum('quantity_fulfilled'),
            ];
        })->values();

        return Inertia::render('bulkstore/issues', [
            'issues' => $grouped,
        ]);
    }
    /**
     * Display products page
     */
    public function products()
    {
        return Inertia::render('bulkstore/products', [
            'products' => Product::all(),
            'categories' => \Illuminate\Support\Facades\DB::table('categories')->get(),
            'departments' => Department::all()
        ]);
    }

    /**
     * Display suppliers page
     */
    public function suppliers()
    {
        $suppliers = Supplier::all();
        return Inertia::render('bulkstore/Suppliers', [
            'suppliers' => $suppliers
        ]);
    }

    /**
     * Store a new bulk store
     */
    public function store(StoreBulkStoreRequest $request): JsonResponse
    {
        $store = BulkStore::create($request->validated());

        return response()->json($store, 201);
    }

    /**
     * Show a specific bulk store
     */
    public function show(BulkStore $bulkStore): JsonResponse
    {
        $bulkStore->load(['items.product']);

        return response()->json($bulkStore);
    }

    /**
     * Update a bulk store
     */
    public function update(UpdateBulkStoreRequest $request, BulkStore $bulkStore): JsonResponse
    {
        $bulkStore->update($request->validated());

        return response()->json($bulkStore);
    }

    /**
     * Delete a bulk store
     */
    public function destroy(BulkStore $bulkStore): JsonResponse
    {
        $bulkStore->delete();

        return response()->json(['message' => 'Bulk store deleted.']);
    }

    /**
     * API endpoint to refresh dashboard data
     */
    public function refreshDashboard(Request $request): JsonResponse
    {
        $period = $request->only(['begin', 'end']);
        $dashboard = new BukkStore($period); // ← FIXED: Correct class name
        $metrics = $dashboard->dashboardMetrics();

        return response()->json([
            'success' => true,
            'data' => $this->formatDashboardData($metrics),
            'updated_at' => Carbon::now()->toDateTimeString()
        ]);
    }

    public function orderStock(Request $request)
    {
        $validated = $request->validate([
            'requestedBy'          => 'required|integer|exists:users,id',
            'department'           => 'required|integer|exists:departments,id',
            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'required|integer|exists:products,id',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.unit_price'   => 'required|numeric|min:0',
            'items.*.batch_number' => 'nullable|string',
            'items.*.expiry_date'  => 'nullable|date',
        ]);

        DB::beginTransaction();

        try {
            // Calculate the header total from line items
            $estimatedTotal = collect($validated['items'])->sum(
                fn($i) => $i['quantity'] * $i['unit_price']
            );

            // 1. Create the parent requisition
            $requisition = DepartmentRequisition::create([
                'requisition_uuid'   => (string) Str::uuid(),
                'requisition_number' => $this->generateRequisitionNumber(),
                'department_id'      => $validated['department'],
                'requested_by'       => $validated['requestedBy'],
                'requested_at'       => now(),
                'status'             => 'pending',
                'priority'           => 'medium',
                'approval_required'  => true,
                'estimated_total'    => $estimatedTotal,
                'created_by'         => $validated['requestedBy'],
                'updated_by'         => $validated['requestedBy'],
            ]);

            // 2. Create line items linked to the header
            $created = [];
            foreach ($validated['items'] as $item) {
                $created[] = DepartmentRequisitionItem::create([
                    'uuid'                 => (string) Str::uuid(),
                    'department_requisition_id'        => $requisition->id, // ← FK to header.id
                    'product_id'           => $item['product_id'],
                    'quantity_requested'   => $item['quantity'],
                    'estimated_unit_price' => $item['unit_price'],
                    'estimated_total'      => $item['quantity'] * $item['unit_price'],
                    'batch_number'         => $item['batch_number'] ?? null,
                    'expiry_date'          => $item['expiry_date'] ?? null,
                ]);
            }

            DB::commit();

            return response()->json([
                'requisition_id'     => $requisition->id,
                'requisition_number' => $requisition->requisition_number,
                'data'               => $created,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to create requisition',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate a unique requisition number like REQ-2026-000123
     */
    private function generateRequisitionNumber(): string
    {
        $year = now()->year;
        $prefix = "REQ-{$year}-";

        $last = DepartmentRequisition::where('requisition_number', 'like', $prefix . '%')
            ->orderByDesc('requisition_number')
            ->value('requisition_number');

        $next = $last
            ? ((int) substr($last, -6)) + 1
            : 1;

        return $prefix . str_pad($next, 6, '0', STR_PAD_LEFT);
    }

    public function issueStockToDepartment(IssueStockRequest $request, ProductIssueService $service)
    {
        $data = $request->validated();

        $item = DepartmentRequisitionItem::findOrFail($data['issue_id']);

        $ledger = $service->issue(
            item: $item,
            quantity: (float) $data['quantity'],
            userId: $request->issuedBy || 1,
            action: $data['action'],
            comment: $data['comment'] ?? null,
        );

        return response()->json([
            'success'        => true,
            'action'         => $data['action'],
            'requisition_id' => (int) $data['requisition_id'],
            'issue_id'       => (int) $data['issue_id'],
            'ledger_id'      => $ledger?->id,
            'message'        => $data['action'] === 'reject'
                ? 'Line rejected.'
                : 'Stock issued successfully.',
        ]);
    }
}
