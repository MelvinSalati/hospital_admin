<?php

namespace App\Http\Controllers\Pharmacies;

use App\Http\Controllers\Controller;
use App\Services\PharmacyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\PatientVisit;
use App\Models\Drug;
use App\Models\DrugItem;
use App\Models\DrugTransaction;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PharmacyController extends Controller
{
    protected PharmacyService $pharmacyService;

    public function __construct(PharmacyService $pharmacyService)
    {
        $this->pharmacyService = $pharmacyService;
    }

    public function index()
    {
        // Get all queued patients for department 2
        $queuedPatients = PatientVisit::with(['patient', 'assignedDepartment', 'assignedStaff', 'visitToken'])
            ->where('department_id', 1)
            ->where('status', 1) // 1 = queued/active
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($visit) {
                return [
                    'id' => $visit->id,
                    'token' => $visit->visitToken?->token ?? $visit->visit_token,
                    'visit_token_id' => $visit->visitToken?->id,
                    'patient_id' => $visit->patient_id,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'contact' => $visit->patient?->phone ?? 'N/A',
                    'gender' => $visit->patient?->gender ?? 'N/A',
                    'payment_method' => $visit->payment_method,
                    'original_payment_method' => $visit->visitToken?->original_payment_method ?? $visit->original_payment_method,
                    'status' => $visit->status,
                    'registered_at' => $visit->started_at ? $visit->started_at->format('Y-m-d H:i:s') : $visit->created_at->format('Y-m-d H:i:s'),
                    'assigned_department' => $visit->assignedDepartment?->department_name ?? 'Not assigned',
                    'assigned_staff' => $visit->assignedStaff?->name ?? 'Not assigned',
                    'visit_status' => $this->mapVisitStatus($visit->status),
                    'priority' => $visit->priority ?? 'routine',
                    'department_id' => $visit->department_id,
                ];
            });

        $stats = [
            'total_in_queue' => PatientVisit::where('department_id', 1)
                ->where('status', 1)
                ->count(),
            'pending_assignment' => PatientVisit::where('department_id', 1)
                ->where('status', 1)
                ->whereNull('to_queue')
                ->count(),
            'assigned_today' => PatientVisit::where('department_id', 1)
                ->whereDate('created_at', today())
                ->where('status', 1)
                ->count(),
        ];

        return Inertia::render('pharmacies/index', [
            'queue' => $queuedPatients,
            'stats' => $stats,
        ]);
    }

    // In your controller

    public function getDispensed()
    {
        $dispensed = \App\Models\Patients\Prescription::with(['patient', 'invoice'])
            ->whereIn('status', ['dispensed', 'completed'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($prescription) {
                // Parse items JSON
                $items = is_string($prescription->items)
                    ? json_decode($prescription->items, true)
                    : $prescription->items;

                // Calculate totals
                $totalQuantity = 0;
                $totalAmount = 0;
                $productList = [];

                if (is_array($items)) {
                    foreach ($items as $item) {
                        $quantity = $item['quantity'] ?? $item['qty'] ?? 1;
                        $price = floatval($item['price'] ?? 0);
                        $totalQuantity += $quantity;
                        $totalAmount += $price * $quantity;

                        $productList[] = [
                            'name' => $item['name'] ?? $item['drug_name'] ?? 'Unknown',
                            'quantity' => $quantity,
                        ];
                    }
                }

                return [
                    'id' => (string) $prescription->id,
                    'invoiceNumber' => $prescription->invoice?->invoice_number ?? $prescription->prescription_number,
                    'patientName' => $prescription->patient?->first_name.' '.$prescription->patient?->last_name ?? 'Unknown Patient',
                    'products' => $productList,
                    'totalQuantity' => $totalQuantity,
                    'totalAmount' => $totalAmount,
                    'status' => $this->mapStatus($prescription->status),
                    'date' => $prescription->dispensed_date ?? $prescription->updated_at,
                    // Additional fields for detail modal
                    'patientId' => $prescription->patient_id,
                    'patientAge' => $prescription->patient?->age ?? null,
                    'patientGender' => $prescription->patient?->gender ?? null,
                    'patientPhone' => $prescription->patient?->phone ?? null,
                    'patientEmail' => $prescription->patient?->email ?? null,
                    'prescribedBy' => $prescription->prescribed_by ?? 'Dr. Unknown',
                    'dispensedBy' => $prescription->dispensed_by ?? 'Pharm. Unknown',
                    'subtotal' => $totalAmount,
                    'notes' => $prescription->dispensing_notes ?? $prescription->clinical_notes,
                ];
            });

        return Inertia::render('pharmacies/dispensed', [
            'dispensed' => $dispensed
        ]);
    }

    private function mapStatus($status)
    {
        $statusMap = [
            'dispensed' => 'completed',
            'completed' => 'completed',
            'active' => 'pending',
            'pending' => 'pending',
            'cancelled' => 'cancelled',
            'void' => 'cancelled',
        ];

        return $statusMap[$status] ?? 'pending';
    }

    /**
     * Get drugs list for dropdown/autocomplete
     */
    public function getDrugsList()
    {
        try {
            return $this->pharmacyService->getDrugsList();
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Pharmacy Dashboard - Get all dashboard data from stock_movements
     */
    public function dashboard()
    {
        // Get all products count
        $totalProducts = DrugItem::where('is_active', 1)->count();

        // Get total dispensed (issuing movements with negative quantity)
        $productsDispensed = StockMovement::where('type', 'issuing')
            ->sum('quantity') * -1;

        // Get total transactions (all stock movements)
        $totalTransactions = StockMovement::count();

        // Calculate trends (compare with last month)
        $lastMonth = now()->subMonth();
        $currentMonthTotal = StockMovement::whereMonth('moved_at', now()->month)
            ->whereYear('moved_at', now()->year)
            ->sum('quantity');

        $lastMonthTotal = StockMovement::whereMonth('moved_at', $lastMonth->month)
            ->whereYear('moved_at', $lastMonth->year)
            ->sum('quantity');

        $productsTrend = $lastMonthTotal > 0
            ? round((($currentMonthTotal - $lastMonthTotal) / abs($lastMonthTotal)) * 100, 1)
            : 0;

        // Get top dispensed drugs
        $topDispensedDrugs = StockMovement::where('type', 'issuing')
            ->select('product_id')
            ->selectRaw('SUM(ABS(quantity)) as total_dispensed')
            ->with('drug')
            ->groupBy('product_id')
            ->orderBy('total_dispensed', 'desc')
            ->limit(4)
            ->get()
            ->map(function ($movement) {
                return [
                    'name' => $movement->drug->drug_name ?? 'Unknown',
                    'value' => (int) $movement->total_dispensed,
                    'color' => $this->getColorForIndex($movement->product_id),
                ];
            });

        // If no top dispensed drugs, use fallback
        if ($topDispensedDrugs->isEmpty()) {
            $topDispensedDrugs = collect([
                ['name' => 'No Data', 'value' => 1, 'color' => '#94A3B8'],
            ]);
        }

        // Get weekly trend data
        $weeklyTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dayDispensed = StockMovement::where('type', 'issuing')
                ->whereDate('moved_at', $date->toDateString())
                ->sum('quantity') * -1;

            $dayRevenue = StockMovement::where('type', 'issuing')
                ->whereDate('moved_at', $date->toDateString())
                ->sum(DB::raw('ABS(quantity) * unit_cost'));

            $weeklyTrend[] = [
                'day' => $date->format('D'),
                'dispensed' => (int) $dayDispensed,
                'revenue' => (float) $dayRevenue,
            ];
        }

        // Get notifications from stock movements
        $notifications = $this->getNotifications();

        // Get recent transactions (last 5 stock movements)
        $recentTransactions = StockMovement::with(['drug', 'supplier', 'createdBy'])
            ->orderBy('moved_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($movement) {
                return [
                    'id' => $movement->id,
                    'invoiceNumber' => $movement->reference_number ?? 'N/A',
                    'patientName' => $movement->createdBy?->name ?? 'System',
                    'products' => [$movement->drug->drug_name ?? 'Unknown'],
                    'quantity' => (int) abs($movement->quantity),
                    'totalAmount' => (float) ($movement->unit_cost * abs($movement->quantity) ?? 0),
                    'status' => $movement->type === 'receiving' ? 'completed' : 'pending',
                    'date' => $movement->moved_at->format('Y-m-d H:i:s'),
                ];
            });

        // Get summary stats
        $stats = [
            'totalProducts' => $totalProducts,
            'productsDispensed' => (int) $productsDispensed,
            'totalTransactions' => $totalTransactions,
            'productsTrend' => $productsTrend,
            'dispensedTrend' => 8.3,
            'transactionsTrend' => 15.2,
        ];

        return Inertia::render('pharmacies/dashboard', [
            'stats' => $stats,
            'topDispensedDrugs' => $topDispensedDrugs,
            'weeklyTrend' => $weeklyTrend,
            'notifications' => $notifications,
            'recentTransactions' => $recentTransactions,
        ]);
    }

    /**
     * Get notifications from stock movements
     */
    private function getNotifications()
    {
        $notifications = [];

        // 1. Low Stock Alert - Calculate stock from stock_movements
        $drugsWithStock = DrugItem::where('is_active', 1)->get();
        $lowStockCount = 0;

        foreach ($drugsWithStock as $drug) {
            // Calculate current stock from stock_movements
            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');

            // Check if stock is low (below reorder level)
            if ($currentStock <= ($drug->reorder_level ?? 0) && $currentStock > 0 && $lowStockCount < 5) {
                $notifications[] = [
                    'id' => 'low_stock_' . $drug->id,
                    'title' => 'Low Stock Alert',
                    'message' => "{$drug->drug_name} has only {$currentStock} units left",
                    'type' => 'warning',
                    'time' => now()->toDateTimeString(),
                    'read' => false,
                ];
                $lowStockCount++;
            }
        }

        // 2. Expiring Soon
        $expiringDrugs = StockMovement::where('expiry_date', '>=', now())
            ->where('expiry_date', '<=', now()->addDays(30))
            ->where('quantity', '>', 0)
            ->with('drug')
            ->limit(5)
            ->get();

        foreach ($expiringDrugs as $movement) {
            $daysLeft = now()->diffInDays($movement->expiry_date);
            $notifications[] = [
                'id' => 'expiring_' . $movement->id,
                'title' => 'Expiring Soon',
                'message' => "{$movement->drug->drug_name} expires in {$daysLeft} days ({$movement->quantity} units)",
                'type' => 'danger',
                'time' => now()->toDateTimeString(),
                'read' => false,
            ];
        }

        // 3. Stock Replenished (recent receiving movements)
        $recentReceivings = StockMovement::where('type', 'receiving')
            ->orderBy('moved_at', 'desc')
            ->with('drug')
            ->limit(3)
            ->get();

        foreach ($recentReceivings as $movement) {
            $notifications[] = [
                'id' => 'replenished_' . $movement->id,
                'title' => 'Stock Replenished',
                'message' => "{$movement->drug->drug_name} has been restocked ({$movement->quantity} units)",
                'type' => 'success',
                'time' => $movement->moved_at->format('Y-m-d H:i:s'),
                'read' => true,
            ];
        }

        // 4. Expired Products
        $expiredCount = StockMovement::where('expiry_date', '<', now())
            ->where('quantity', '>', 0)
            ->count();

        if ($expiredCount > 0) {
            $notifications[] = [
                'id' => 'expired_products',
                'title' => 'Expired Products',
                'message' => "{$expiredCount} products have expired",
                'type' => 'danger',
                'time' => now()->toDateTimeString(),
                'read' => false,
            ];
        }

        // Sort by time (newest first) and limit to 10
        usort($notifications, function ($a, $b) {
            return strtotime($b['time']) - strtotime($a['time']);
        });

        return array_slice($notifications, 0, 10);
    }

    /**
     * Get color for pie chart based on index
     */
    private function getColorForIndex($index)
    {
        $colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#F97316', '#14B8A6'];
        return $colors[$index % count($colors)];
    }

    /**
     * Logistics page - returns suppliers for dropdown
     */
    public function logistics()
    {
        // Get all active suppliers
        $suppliers = Supplier::where('is_active', 1)
            ->orderBy('supplier_name')
            ->get()
            ->map(function ($supplier) {
                return [
                    'id' => $supplier->id,
                    'supplier_code' => $supplier->supplier_code,
                    'supplier_name' => $supplier->supplier_name,
                    'contact_person' => $supplier->contact_person,
                    'phone' => $supplier->phone,
                    'email' => $supplier->email,
                    'address' => $supplier->address,
                    'city' => $supplier->city,
                    'country' => $supplier->country,
                    'rating' => $supplier->rating,
                    'is_active' => $supplier->is_active,
                ];
            });

        return Inertia::render('pharmacies/logistics', [
            'suppliers' => $suppliers,
        ]);
    }

    /**
     * Search for drugs by name, barcode, or generic name
     * Returns drug details with transaction history from StockMovement
     */
    public function searchDrugs(Request $request)
    {
        $query = $request->input('q');

        if (empty($query)) {
            return response()->json([
                'success' => false,
                'message' => 'Search query is required'
            ], 400);
        }

        try {
            // Search for drug
            $drug = DrugItem::where(function ($q) use ($query) {
                $q->where('drug_name', 'LIKE', "%{$query}%")
                    ->orWhere('barcode', $query)
                    ->orWhere('generic_name', 'LIKE', "%{$query}%")
                    ->orWhere('drug_code', 'LIKE', "%{$query}%");
            })
                ->where('is_active', 1)
                ->first();

            if (!$drug) {
                return response()->json([
                    'success' => false,
                    'message' => 'Drug not found'
                ]);
            }

            // Get current stock balance from StockMovement
            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');

            // Get stock summary from StockMovement
            $stockSummary = StockMovement::where('product_id', $drug->id)
                ->selectRaw('
                    COALESCE(SUM(CASE WHEN type = "receiving" THEN quantity ELSE 0 END), 0) as total_received,
                    COALESCE(SUM(CASE WHEN type = "issuing" THEN quantity ELSE 0 END), 0) as total_issued,
                    COALESCE(SUM(CASE WHEN type = "transfer" THEN quantity ELSE 0 END), 0) as total_transferred,
                    COALESCE(SUM(CASE WHEN type = "adjustment" THEN quantity ELSE 0 END), 0) as total_adjusted,
                    COALESCE(SUM(quantity), 0) as current_stock,
                    COUNT(*) as total_movements
                ')
                ->first();

            // Get transaction history (last 20) from StockMovement
            $transactions = StockMovement::where('product_id', $drug->id)
                ->with(['supplier', 'createdBy', 'fromDepartment', 'toDepartment'])
                ->orderBy('moved_at', 'desc')
                ->limit(20)
                ->get()
                ->map(function ($movement) {
                    return [
                        'id' => $movement->id,
                        'drug_id' => $movement->product_id,
                        'transaction_type' => $movement->type,
                        'quantity' => $movement->quantity,
                        'balance_after' => $movement->balance_after ?? 0,
                        'reference_number' => $movement->reference_number,
                        'transaction_date' => $movement->moved_at ? $movement->moved_at->format('Y-m-d H:i:s') : null,
                        'created_by' => $movement->createdBy?->name ?? null,
                        'notes' => $movement->remarks,
                        'patient_name' => null,
                        'invoice_number' => $movement->reference_number,
                        'source_department' => $movement->fromDepartment?->department_name ?? null,
                        'destination_department' => $movement->toDepartment?->department_name ?? null,
                        'supplier_name' => $movement->supplier?->supplier_name ?? null,
                        'batch_number' => $movement->batch_number ?? null,
                        'expiry_date' => $movement->expiry_date ? $movement->expiry_date->format('Y-m-d') : null,
                        'unit_cost' => $movement->unit_cost,
                    ];
                });

            // Build response with drug data and stock movement data
            $drugData = [
                'id' => $drug->id,
                'drug_code' => $drug->drug_code,
                'drug_name' => $drug->drug_name,
                'generic_name' => $drug->generic_name,
                'brand_name' => $drug->brand_name,
                'barcode' => $drug->barcode,
                'qr_code' => $drug->qr_code,
                'category_id' => $drug->category_id,
                'service_id' => $drug->service_id,
                'therapeutic_class' => $drug->therapeutic_class,
                'schedule_class' => $drug->schedule_class,
                'strength' => $drug->strength,
                'dosage_form' => $drug->dosage_form,
                'route_of_administration' => $drug->route_of_administration,
                'unit_of_measure' => $drug->unit_of_measure,
                'pack_size' => $drug->pack_size,
                'minimum_stock_level' => $drug->minimum_stock_level,
                'maximum_stock_level' => $drug->maximum_stock_level,
                'reorder_level' => $drug->reorder_level,
                'purchase_price' => $drug->purchase_price,
                'selling_price' => $drug->selling_price,
                'insurance_price' => $drug->insurance_price,
                'is_arv' => $drug->is_arv,
                'is_tb_drug' => $drug->is_tb_drug,
                'is_emergency' => $drug->is_emergency,
                'is_controlled' => $drug->is_controlled,
                'track_batches' => $drug->track_batches,
                'track_expiry' => $drug->track_expiry,
                'allow_negative_stock' => $drug->allow_negative_stock,
                'is_active' => $drug->is_active,
                'discontinued' => $drug->discontinued,
                'current_stock' => $stockSummary->current_stock ?? 0,
                'total_received' => $stockSummary->total_received ?? 0,
                'total_issued' => $stockSummary->total_issued ?? 0,
                'total_transferred' => $stockSummary->total_transferred ?? 0,
                'total_adjusted' => $stockSummary->total_adjusted ?? 0,
                'total_movements' => $stockSummary->total_movements ?? 0,
                'transactions' => $transactions,
            ];

            return response()->json([
                'success' => true,
                'drug' => $drugData,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new drug
     */
    public function storeDrug(Request $request)
    {
        $validated = $request->validate([
            'drug_name' => 'required|string|max:255',
            'drug_code' => 'required|string|max:50|unique:drug_items',
            'generic_name' => 'nullable|string|max:255',
            'brand_name' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:100',
            'therapeutic_class' => 'nullable|string|max:150',
            'schedule_class' => 'nullable|string|max:50',
            'strength' => 'nullable|string|max:100',
            'dosage_form' => 'required|string|max:100',
            'route_of_administration' => 'nullable|string|max:50',
            'unit_of_measure' => 'nullable|string|max:50',
            'pack_size' => 'nullable|integer|min:0',
            'minimum_stock_level' => 'nullable|integer|min:0',
            'maximum_stock_level' => 'nullable|integer|min:0',
            'reorder_level' => 'nullable|integer|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'selling_price' => 'nullable|numeric|min:0',
            'insurance_price' => 'nullable|numeric|min:0',
            'is_arv' => 'boolean',
            'is_tb_drug' => 'boolean',
            'is_emergency' => 'boolean',
            'is_controlled' => 'boolean',
            'track_batches' => 'boolean',
            'track_expiry' => 'boolean',
            'allow_negative_stock' => 'boolean',
        ]);

        try {
            $drug = DrugItem::create(array_merge($validated, [
                'created_by' => auth()->id(),
                'is_active' => true,
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Drug added successfully',
                'drug' => $drug,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get detailed drug information with full transaction history
     */
    public function getDrugDetails($id)
    {
        try {
            $drug = DrugItem::findOrFail($id);

            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');

            $transactions = StockMovement::where('product_id', $drug->id)
                ->with(['supplier', 'createdBy', 'fromDepartment', 'toDepartment'])
                ->orderBy('moved_at', 'desc')
                ->paginate(15);

            return response()->json([
                'success' => true,
                'drug' => $drug,
                'current_stock' => $currentStock,
                'transactions' => $transactions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Perform physical count of drug stock
     */
    public function physicalCount(Request $request, $id)
    {
        $request->validate([
            'new_quantity' => 'required|integer|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $drug = DrugItem::findOrFail($id);
            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');
            $adjustment = $request->new_quantity - $currentStock;

            // Create movement record directly without recordMovement
            $movement = StockMovement::create([
                'movement_uuid' => (string) Str::uuid(),
                'product_id' => $drug->id,
                'type' => 'adjustment',
                'quantity' => $adjustment,
                'balance_after' => $request->new_quantity,
                'reference_number' => 'PC-' . date('Ymd') . '-' . str_pad($drug->id, 4, '0', STR_PAD_LEFT),
                'moved_at' => now(),
                'created_by' => auth()->id(),
                'remarks' => $request->notes . ' | Previous: ' . $currentStock . ', New: ' . $request->new_quantity,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Physical count completed successfully',
                'data' => [
                    'movement' => $movement,
                    'previous_stock' => $currentStock,
                    'new_stock' => $request->new_quantity,
                    'adjustment' => $adjustment,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Issue stock to another department
     */
    public function issueStock(Request $request, $id)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1',
            'destination' => 'required|string|max:255',
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $drug = DrugItem::findOrFail($id);
            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');

            if ($request->quantity > $currentStock) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock. Available: ' . $currentStock
                ], 400);
            }

            // Create movement record using StockMovement
            $movement = StockMovement::recordMovement([
                'product_id' => $drug->id,
                'type' => 'issuing',
                'quantity' => -$request->quantity,
                'reference_number' => 'ISS-' . date('Ymd') . '-' . $drug->id,
                'moved_at' => now(),
                'created_by' => auth()->id(),
                'remarks' => $request->notes,
                'to_department_id' => $request->destination,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Stock issued successfully',
                'transaction' => $movement,
                'new_stock' => $currentStock - $request->quantity,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get transaction history for a specific drug
     */
    public function getTransactions($id)
    {
        try {
            $transactions = StockMovement::where('product_id', $id)
                ->with(['supplier', 'createdBy', 'fromDepartment', 'toDepartment'])
                ->orderBy('moved_at', 'desc')
                ->paginate(20);

            return response()->json([
                'success' => true,
                'transactions' => $transactions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Receive stock from supplier
     */
    public function receiveStock(Request $request)
    {
        $validated = $request->validate([
            'drug_id' => 'required|exists:drug_items,id',
            'quantity' => 'required|integer|min:1',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'reference_number' => 'nullable|string|max:255',
            'batch_number' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|date',
            'unit_cost' => 'nullable|numeric|min:0',
            'remarks' => 'nullable|string|max:500',
            'moved_at' => 'nullable|date',
        ]);

        try {
            // Calculate current stock for balance_after
            $currentStock = StockMovement::where('product_id', $validated['product_id'])->sum('quantity');

            // Create the movement directly
            $movement = StockMovement::create([
                'movement_uuid' => (string) Str::uuid(),
                'product_id' => $validated['drug_id'],
                'type' => 'receiving',
                'quantity' => $validated['quantity'],
                'balance_after' => $currentStock + $validated['quantity'],
                'supplier_id' => $validated['supplier_id'] ?? null,
                'reference_number' => $validated['reference_number'] ?? null,
                'batch_number' => $validated['batch_number'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'unit_cost' => $validated['unit_cost'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
                'moved_at' => $validated['moved_at'] ?? now(),
                'created_by' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Stock received successfully',
                'data' => $movement,
                'new_stock' => $movement->balance_after,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // Helper method to map status codes to readable strings
    private function mapVisitStatus($status)
    {
        return match ($status) {
            1 => 'queued',
            2 => 'in_progress',
            3 => 'completed',
            4 => 'cancelled',
            default => 'pending'
        };
    }

    public function dispensed()
    {
        return Inertia::render('pharmacies/dispensed');
    }

    public function drugs()
    {
        return Inertia::render('pharmacies/drugs');
    }
}
