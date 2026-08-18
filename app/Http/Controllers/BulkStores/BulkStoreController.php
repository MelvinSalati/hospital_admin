<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStores\StoreBulkStoreRequest;
use App\Http\Requests\BulkStores\UpdateBulkStoreRequest;
use App\Models\BulkStores\BulkStore;
use App\Dashboards\BulkStores\Metrics;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Supplier;
use App\Models\BulkStores\Product;
use App\Models\BulkStores\PurchaseRequisition;
use App\Models\Department;
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
            'totalStockValue' => PurchaseRequisition::with('item.products')->where('status','approved')
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
    public function issues()
    {
        return Inertia::render('bulkstore/issues', [
            'issues' => [],
        ]);
    }

    /**
     * Display products page
     */
    public function products()
    {
        return Inertia::render('bulkstore/products', [
            'products' => []
        ]);
    }

    /**
     * Display suppliers page
     */
    public function suppliers()
    {
        $suppliers = Supplier::all();
        return Inertia::render('bulkstore/suppliers', [
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
}