<?php

namespace App\Http\Controllers\Pharmacies;

use App\Http\Controllers\Controller;
use App\Http\Requests\RequestDispenseDrug;
use App\Models\Department;
use App\Models\DepartmentStockLedger;
use App\Models\DrugItem;
use App\Models\Patients\Prescription;
use App\Models\Patients\PrescriptionItem;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Services\Pharmacies\DispenseService;
use App\Services\PharmacyService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PharmacyController extends Controller
{
    protected PharmacyService $pharmacyService;
    protected DispenseService $dispenseService;

    public function __construct(
        PharmacyService $pharmacyService,
        DispenseService $dispenseService,
    ) {
        $this->pharmacyService = $pharmacyService;
        $this->dispenseService = $dispenseService;
    }

    // =========================================================================
    // Dispensing queue
    // =========================================================================

    public function index()
    {
        $prescriptions = Prescription::with(['patient', 'Items'])
            ->whereIn('status', ['active', 'pending'])
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function (Prescription $rx) {
                $items = $rx->Items;

                $pending = $items
                    ->where('dispensation_status', 'pending')
                    ->where('is_cancelled', false)
                    ->count();

                return [
                    'id'            => $rx->id,
                    'token'         => $rx->visit_token,
                    'rx_number'     => $rx->prescription_number,
                    'patient_name'  => $rx->patient
                        ? trim($rx->patient->first_name . ' ' . $rx->patient->last_name)
                        : 'Unknown',
                    'patient_id'    => $rx->patient_id,
                    'created_at'    => $rx->created_at?->toIso8601String(),
                    'status'        => $rx->status,
                    'item_count'    => $items->count(),
                    'pending_count' => $pending,

                    'items' => $items->map(fn(PrescriptionItem $i) => [
                        'id'                  => $i->id,
                        'drug_name'           => $i->drug_name,
                        'dosage'              => $i->dosage,
                        'dosage_unit'         => $i->dosage_unit,
                        'frequency'           => $i->frequency,
                        'route'               => $i->route,
                        'duration'            => $i->duration,
                        'duration_unit'       => $i->duration_unit,
                        'instructions'        => $i->instructions,
                        'quantity_prescribed' => (float) $i->quantity_prescribed,
                        'quantity_dispensed'  => (float) $i->quantity_dispensed,
                        'quantity_remaining'  => (float) $i->quantity_remaining,
                        'dispensation_status' => $i->dispensation_status,
                    ])->values(),
                ];
            });

        return Inertia::render('pharmacies/queue', [
            'prescriptions' => $prescriptions,
        ]);
    }

    public function dispense(RequestDispenseDrug $request, Prescription $prescriptionId)
    {
        $departmentId = $request->department_id;
        $userId       = $request->user()?->id ?? 1;

        try {
            $created = $this->dispenseService->dispense(
                prescription: $prescriptionId,
                items: $request->validated()['items'],
                userId: $userId,
                departmentId: (int) $departmentId,
            );

            return response()->json([
                'success'   => true,
                'dispensed' => $created,
                'count'     => count($created),
                'status'    => $prescriptionId->fresh()->status,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Dispense failed: ' . $e->getMessage(),
                'type'    => get_class($e),
            ], 500);
        }
    }

    public function getDispensed()
    {
        $dispensed = Prescription::with(['patient', 'invoice'])
            ->whereIn('status', ['dispensed', 'completed'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($prescription) {
                $items = is_string($prescription->items)
                    ? json_decode($prescription->items, true)
                    : $prescription->items;

                $totalQuantity = 0;
                $totalAmount   = 0;
                $productList   = [];

                if (is_array($items)) {
                    foreach ($items as $item) {
                        $quantity     = $item['quantity'] ?? $item['qty'] ?? 1;
                        $price        = (float) ($item['price'] ?? 0);
                        $totalQuantity += $quantity;
                        $totalAmount   += $price * $quantity;

                        $productList[] = [
                            'name'     => $item['name'] ?? $item['drug_name'] ?? 'Unknown',
                            'quantity' => $quantity,
                        ];
                    }
                }

                return [
                    'id'            => (string) $prescription->id,
                    'invoiceNumber' => $prescription->invoice?->invoice_number ?? $prescription->prescription_number,
                    'patientName'   => $prescription->patient
                        ? trim($prescription->patient->first_name . ' ' . $prescription->patient->last_name)
                        : 'Unknown Patient',
                    'products'      => $productList,
                    'totalQuantity' => $totalQuantity,
                    'totalAmount'   => $totalAmount,
                    'status'        => $this->mapStatus($prescription->status),
                    'date'          => $prescription->dispensed_date ?? $prescription->updated_at,
                    'patientId'     => $prescription->patient_id,
                    'patientAge'    => $prescription->patient?->age ?? null,
                    'patientGender' => $prescription->patient?->gender ?? null,
                    'patientPhone'  => $prescription->patient?->phone ?? null,
                    'patientEmail'  => $prescription->patient?->email ?? null,
                    'prescribedBy'  => $prescription->prescribed_by ?? 'Dr. Unknown',
                    'dispensedBy'   => $prescription->dispensed_by ?? 'Pharm. Unknown',
                    'subtotal'      => $totalAmount,
                    'notes'         => $prescription->dispensing_notes ?? $prescription->clinical_notes,
                ];
            });

        return Inertia::render('pharmacies/dispensed', [
            'dispensed' => $dispensed,
        ]);
    }

    private function mapStatus($status)
    {
        return [
            'dispensed' => 'completed',
            'completed' => 'completed',
            'active'    => 'pending',
            'pending'   => 'pending',
            'cancelled' => 'cancelled',
            'void'      => 'cancelled',
        ][$status] ?? 'pending';
    }

    // =========================================================================
    // Drugs
    // =========================================================================

    public function getDrugsList()
    {
        try {
            return $this->pharmacyService->getDrugsList();
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function drugs()
    {
        return Inertia::render('pharmacies/drugs');
    }

    public function storeDrug(Request $request)
    {
        $validated = $request->validate([
            'drug_name'              => 'required|string|max:255',
            'drug_code'              => 'required|string|max:50|unique:drug_items',
            'generic_name'           => 'nullable|string|max:255',
            'brand_name'             => 'nullable|string|max:255',
            'barcode'                => 'nullable|string|max:100',
            'therapeutic_class'      => 'nullable|string|max:150',
            'schedule_class'         => 'nullable|string|max:50',
            'strength'               => 'nullable|string|max:100',
            'dosage_form'            => 'required|string|max:100',
            'route_of_administration' => 'nullable|string|max:50',
            'unit_of_measure'        => 'nullable|string|max:50',
            'pack_size'              => 'nullable|integer|min:0',
            'minimum_stock_level'    => 'nullable|integer|min:0',
            'maximum_stock_level'    => 'nullable|integer|min:0',
            'reorder_level'          => 'nullable|integer|min:0',
            'purchase_price'         => 'nullable|numeric|min:0',
            'selling_price'          => 'nullable|numeric|min:0',
            'insurance_price'        => 'nullable|numeric|min:0',
            'is_arv'                 => 'boolean',
            'is_tb_drug'             => 'boolean',
            'is_emergency'           => 'boolean',
            'is_controlled'          => 'boolean',
            'track_batches'          => 'boolean',
            'track_expiry'           => 'boolean',
            'allow_negative_stock'   => 'boolean',
        ]);

        try {
            $drug = DrugItem::create(array_merge($validated, [
                'created_by' => auth()->id(),
                'is_active'  => true,
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Drug added successfully',
                'drug'    => $drug,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function searchDrugs(Request $request)
    {
        $query = $request->input('q');

        if (empty($query)) {
            return response()->json([
                'success' => false,
                'message' => 'Search query is required',
            ], 400);
        }

        try {
            $drug = DrugItem::where(function ($q) use ($query) {
                $q->where('drug_name', 'LIKE', "%{$query}%")
                    ->orWhere('barcode', $query)
                    ->orWhere('generic_name', 'LIKE', "%{$query}%")
                    ->orWhere('drug_code', 'LIKE', "%{$query}%");
            })
                ->where('is_active', 1)
                ->first();

            if (! $drug) {
                return response()->json([
                    'success' => false,
                    'message' => 'Drug not found',
                ]);
            }

            $stockSummary = StockMovement::where('product_id', $drug->id)
                ->selectRaw('
                    COALESCE(SUM(CASE WHEN type = "receiving"  THEN quantity ELSE 0 END), 0) as total_received,
                    COALESCE(SUM(CASE WHEN type = "issuing"    THEN quantity ELSE 0 END), 0) as total_issued,
                    COALESCE(SUM(CASE WHEN type = "transfer"   THEN quantity ELSE 0 END), 0) as total_transferred,
                    COALESCE(SUM(CASE WHEN type = "adjustment" THEN quantity ELSE 0 END), 0) as total_adjusted,
                    COALESCE(SUM(quantity), 0) as current_stock,
                    COUNT(*) as total_movements
                ')
                ->first();

            $transactions = StockMovement::where('product_id', $drug->id)
                ->with(['supplier', 'createdBy', 'fromDepartment', 'toDepartment'])
                ->orderBy('moved_at', 'desc')
                ->limit(20)
                ->get()
                ->map(fn($movement) => [
                    'id'                     => $movement->id,
                    'drug_id'                => $movement->product_id,
                    'transaction_type'       => $movement->type,
                    'quantity'               => $movement->quantity,
                    'balance_after'          => $movement->balance_after ?? 0,
                    'reference_number'       => $movement->reference_number,
                    'transaction_date'       => $movement->moved_at?->format('Y-m-d H:i:s'),
                    'created_by'             => $movement->createdBy?->name,
                    'notes'                  => $movement->remarks,
                    'patient_name'           => null,
                    'invoice_number'         => $movement->reference_number,
                    'source_department'      => $movement->fromDepartment?->department_name,
                    'destination_department' => $movement->toDepartment?->department_name,
                    'supplier_name'          => $movement->supplier?->supplier_name,
                    'batch_number'           => $movement->batch_number,
                    'expiry_date'            => $movement->expiry_date?->format('Y-m-d'),
                    'unit_cost'              => $movement->unit_cost,
                ]);

            $drugData = array_merge($drug->toArray(), [
                'current_stock'     => $stockSummary->current_stock ?? 0,
                'total_received'    => $stockSummary->total_received ?? 0,
                'total_issued'      => $stockSummary->total_issued ?? 0,
                'total_transferred' => $stockSummary->total_transferred ?? 0,
                'total_adjusted'    => $stockSummary->total_adjusted ?? 0,
                'total_movements'   => $stockSummary->total_movements ?? 0,
                'transactions'      => $transactions,
            ]);

            return response()->json([
                'success' => true,
                'drug'    => $drugData,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function getDrugDetails($id)
    {
        try {
            $drug          = DrugItem::findOrFail($id);
            $currentStock  = StockMovement::where('product_id', $drug->id)->sum('quantity');

            $transactions = StockMovement::where('product_id', $drug->id)
                ->with(['supplier', 'createdBy', 'fromDepartment', 'toDepartment'])
                ->orderBy('moved_at', 'desc')
                ->paginate(15);

            return response()->json([
                'success'       => true,
                'drug'          => $drug,
                'current_stock' => $currentStock,
                'transactions'  => $transactions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function getTransactions($id)
    {
        try {
            $transactions = StockMovement::where('product_id', $id)
                ->with(['supplier', 'createdBy', 'fromDepartment', 'toDepartment'])
                ->orderBy('moved_at', 'desc')
                ->paginate(20);

            return response()->json([
                'success'      => true,
                'transactions' => $transactions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // =========================================================================
    // Stock movement
    // =========================================================================

    public function physicalCount(Request $request, $id)
    {
        $request->validate([
            'new_quantity' => 'required|integer|min:0',
            'notes'        => 'nullable|string|max:500',
        ]);

        try {
            $drug          = DrugItem::findOrFail($id);
            $currentStock  = StockMovement::where('product_id', $drug->id)->sum('quantity');
            $adjustment    = $request->new_quantity - $currentStock;

            $movement = StockMovement::create([
                'movement_uuid'    => (string) Str::uuid(),
                'product_id'       => $drug->id,
                'type'             => 'adjustment',
                'quantity'         => $adjustment,
                'balance_after'    => $request->new_quantity,
                'reference_number' => 'PC-' . date('Ymd') . '-' . str_pad($drug->id, 4, '0', STR_PAD_LEFT),
                'moved_at'         => now(),
                'created_by'       => auth()->id(),
                'remarks'          => trim(($request->notes ?? '') . ' | Previous: ' . $currentStock . ', New: ' . $request->new_quantity),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Physical count completed successfully',
                'data'    => [
                    'movement'       => $movement,
                    'previous_stock' => $currentStock,
                    'new_stock'      => $request->new_quantity,
                    'adjustment'     => $adjustment,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function issueStock(Request $request, $id)
    {
        $request->validate([
            'quantity'    => 'required|integer|min:1',
            'destination' => 'required|string|max:255',
            'notes'       => 'nullable|string|max:500',
        ]);

        try {
            $drug         = DrugItem::findOrFail($id);
            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');

            if ($request->quantity > $currentStock) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock. Available: ' . $currentStock,
                ], 400);
            }

            $movement = StockMovement::recordMovement([
                'product_id'       => $drug->id,
                'type'             => 'issuing',
                'quantity'         => -$request->quantity,
                'reference_number' => 'ISS-' . date('Ymd') . '-' . $drug->id,
                'moved_at'         => now(),
                'created_by'       => auth()->id(),
                'remarks'          => $request->notes,
                'to_department_id' => $request->destination,
            ]);

            return response()->json([
                'success'     => true,
                'message'     => 'Stock issued successfully',
                'transaction' => $movement,
                'new_stock'   => $currentStock - $request->quantity,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function receiveStock(Request $request)
    {
        $validated = $request->validate([
            'drug_id'          => 'required|exists:drug_items,id',
            'quantity'         => 'required|integer|min:1',
            'supplier_id'      => 'nullable|exists:suppliers,id',
            'reference_number' => 'nullable|string|max:255',
            'batch_number'     => 'nullable|string|max:255',
            'expiry_date'      => 'nullable|date',
            'unit_cost'        => 'nullable|numeric|min:0',
            'remarks'          => 'nullable|string|max:500',
            'moved_at'         => 'nullable|date',
        ]);

        try {
            $currentStock = StockMovement::where('product_id', $validated['drug_id'])->sum('quantity');

            $movement = StockMovement::create([
                'movement_uuid'    => (string) Str::uuid(),
                'product_id'       => $validated['drug_id'],
                'type'             => 'receiving',
                'quantity'         => $validated['quantity'],
                'balance_after'    => $currentStock + $validated['quantity'],
                'supplier_id'      => $validated['supplier_id'] ?? null,
                'reference_number' => $validated['reference_number'] ?? null,
                'batch_number'     => $validated['batch_number'] ?? null,
                'expiry_date'      => $validated['expiry_date'] ?? null,
                'unit_cost'        => $validated['unit_cost'] ?? null,
                'remarks'          => $validated['remarks'] ?? null,
                'moved_at'         => $validated['moved_at'] ?? now(),
                'created_by'       => auth()->id(),
            ]);

            return response()->json([
                'success'   => true,
                'message'   => 'Stock received successfully',
                'data'      => $movement,
                'new_stock' => $movement->balance_after,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // =========================================================================
    // Dashboard
    // =========================================================================

    public function dashboard()
    {
        $totalProducts       = DrugItem::where('is_active', 1)->count();
        $productsDispensed   = StockMovement::where('type', 'issuing')->sum('quantity') * -1;
        $totalTransactions   = StockMovement::count();

        $lastMonth              = now()->subMonth();
        $currentMonthTotal      = StockMovement::whereMonth('moved_at', now()->month)->whereYear('moved_at', now()->year)->sum('quantity');
        $lastMonthTotal         = StockMovement::whereMonth('moved_at', $lastMonth->month)->whereYear('moved_at', $lastMonth->year)->sum('quantity');
        $productsTrend          = $lastMonthTotal > 0
            ? round((($currentMonthTotal - $lastMonthTotal) / abs($lastMonthTotal)) * 100, 1)
            : 0;

        $topDispensedDrugs = StockMovement::where('type', 'issuing')
            ->select('product_id')
            ->selectRaw('SUM(ABS(quantity)) as total_dispensed')
            ->with('drug')
            ->groupBy('product_id')
            ->orderBy('total_dispensed', 'desc')
            ->limit(4)
            ->get()
            ->map(fn($movement) => [
                'name'  => $movement->drug->drug_name ?? 'Unknown',
                'value' => (int) $movement->total_dispensed,
                'color' => $this->getColorForIndex($movement->product_id),
            ]);

        if ($topDispensedDrugs->isEmpty()) {
            $topDispensedDrugs = collect([['name' => 'No Data', 'value' => 1, 'color' => '#94A3B8']]);
        }

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
                'day'       => $date->format('D'),
                'dispensed' => (int) $dayDispensed,
                'revenue'   => (float) $dayRevenue,
            ];
        }

        $recentTransactions = StockMovement::with(['drug', 'supplier', 'createdBy'])
            ->orderBy('moved_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($movement) => [
                'id'            => $movement->id,
                'invoiceNumber' => $movement->reference_number ?? 'N/A',
                'patientName'   => $movement->createdBy?->name ?? 'System',
                'products'      => [$movement->drug->drug_name ?? 'Unknown'],
                'quantity'      => (int) abs($movement->quantity),
                'totalAmount'   => (float) ($movement->unit_cost * abs($movement->quantity) ?? 0),
                'status'        => $movement->type === 'receiving' ? 'completed' : 'pending',
                'date'          => $movement->moved_at->format('Y-m-d H:i:s'),
            ]);

        return Inertia::render('pharmacies/dashboard', [
            'stats' => [
                'totalProducts'     => $totalProducts,
                'productsDispensed' => (int) $productsDispensed,
                'totalTransactions' => $totalTransactions,
                'productsTrend'     => $productsTrend,
                'dispensedTrend'    => 8.3,
                'transactionsTrend' => 15.2,
            ],
            'topDispensedDrugs' => $topDispensedDrugs,
            'weeklyTrend'       => $weeklyTrend,
            'notifications'     => $this->getNotifications(),
            'recentTransactions' => $recentTransactions,
        ]);
    }

    private function getNotifications()
    {
        $notifications = [];

        // 1. Low stock
        $lowStockCount = 0;
        foreach (DrugItem::where('is_active', 1)->get() as $drug) {
            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');
            $reorder      = $drug->reorder_level ?? $drug->minimum_stock_level ?? 0;

            if ($currentStock > 0 && $currentStock <= $reorder && $lowStockCount < 5) {
                $notifications[] = [
                    'id'      => 'low_stock_' . $drug->id,
                    'title'   => 'Low Stock Alert',
                    'message' => "{$drug->drug_name} has only {$currentStock} units left",
                    'type'    => 'warning',
                    'time'    => now()->toDateTimeString(),
                    'read'    => false,
                ];
                $lowStockCount++;
            }
        }

        // 2. Expiring soon (movements only, >= today and <= today+30)
        $expiring = StockMovement::where('expiry_date', '>=', now())
            ->where('expiry_date', '<=', now()->addDays(30))
            ->where('quantity', '>', 0)
            ->with('drug')
            ->limit(5)
            ->get();

        foreach ($expiring as $movement) {
            $daysLeft = now()->diffInDays($movement->expiry_date);
            $notifications[] = [
                'id'      => 'expiring_' . $movement->id,
                'title'   => 'Expiring Soon',
                'message' => "{$movement->drug->drug_name} expires in {$daysLeft} days ({$movement->quantity} units)",
                'type'    => 'danger',
                'time'    => now()->toDateTimeString(),
                'read'    => false,
            ];
        }

        // 3. Recent receivings
        foreach (StockMovement::where('type', 'receiving')->orderBy('moved_at', 'desc')->with('drug')->limit(3)->get() as $movement) {
            $notifications[] = [
                'id'      => 'replenished_' . $movement->id,
                'title'   => 'Stock Replenished',
                'message' => "{$movement->drug->drug_name} has been restocked ({$movement->quantity} units)",
                'type'    => 'success',
                'time'    => $movement->moved_at->format('Y-m-d H:i:s'),
                'read'    => true,
            ];
        }

        // 4. Expired — count distinct products, not movements
        $expiredProducts = StockMovement::where('expiry_date', '<', now())
            ->where('quantity', '>', 0)
            ->distinct('product_id')
            ->count('product_id');

        if ($expiredProducts > 0) {
            $notifications[] = [
                'id'      => 'expired_products',
                'title'   => 'Expired Products',
                'message' => "{$expiredProducts} products have expired",
                'type'    => 'danger',
                'time'    => now()->toDateTimeString(),
                'read'    => false,
            ];
        }

        usort($notifications, fn($a, $b) => strtotime($b['time']) - strtotime($a['time']));

        return array_slice($notifications, 0, 10);
    }

    private function getColorForIndex($index)
    {
        $colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#F97316', '#14B8A6'];
        return $colors[$index % count($colors)];
    }

    // =========================================================================
    // Logistics
    // =========================================================================

    public function logistics()
    {
        $suppliers = Supplier::where('is_active', 1)
            ->orderBy('supplier_name')
            ->get()
            ->map(fn($s) => [
                'id'            => $s->id,
                'supplier_code' => $s->supplier_code,
                'supplier_name' => $s->supplier_name,
                'contact_person' => $s->contact_person,
                'phone'         => $s->phone,
                'email'         => $s->email,
                'address'       => $s->address,
                'city'          => $s->city,
                'country'       => $s->country,
                'rating'        => $s->rating,
                'is_active'     => $s->is_active,
            ]);

        return Inertia::render('pharmacies/logistics', [
            'suppliers' => $suppliers,
        ]);
    }

    // =========================================================================
    // Stock monitoring
    // =========================================================================

    public function stockMonitoring(Request $request)
    {
        try {
            $departmentId = $request->input('department_id');
            $expiryWindow = (int) $request->input('expiry_window', 90);
            $search       = $request->input('search');
            $showDepleted = $request->boolean('show_depleted', false);

            $today         = Carbon::today();
            $expiryHorizon = $today->copy()->addDays($expiryWindow);

            /* ---------- 1. Batches ---------- */
            $batchesQuery = DB::table('stock_batches as sb')
                ->join('products as p', 'p.id', '=', 'sb.product_id')
                ->select([
                    'sb.id',
                    'sb.product_id',
                    'sb.batch_number',
                    'sb.expiry_date',
                    'sb.quantity',
                    'sb.received_quantity',
                    'sb.remaining_quantity',
                    'sb.status',
                    'sb.location',
                    'sb.supplier_id',
                    'sb.created_at',
                    'p.product_name as product_name',   // ✅
                    'p.product_code as product_sku',    // ✅ was p.sku
                ]);

            if ($search) {
                $batchesQuery->where(function ($q) use ($search) {
                    $q->where('p.product_name', 'like', "%{$search}%")
                        ->orWhere('p.product_code', 'like', "%{$search}%")
                        ->orWhere('sb.batch_number', 'like', "%{$search}%");
                });
            }

            if (! $showDepleted) {
                $batchesQuery->where('sb.remaining_quantity', '>', 0);
            }

            $batches = $batchesQuery->orderBy('sb.expiry_date', 'asc')->get();

            $batches = $batches->map(function ($b) use ($today, $expiryHorizon) {
                $expiry    = $b->expiry_date ? Carbon::parse($b->expiry_date) : null;
                $daysLeft  = $expiry ? $today->diffInDays($expiry, false) : null;
                $received  = (int) $b->received_quantity;
                $remaining = (int) $b->remaining_quantity;
                $quantity  = (int) $b->quantity;
                $dispensed = max(0, $received - $remaining);

                $status = 'ok';
                if ($remaining <= 0) {
                    $status = 'depleted';
                } elseif ($expiry && $expiry->lt($today)) {
                    $status = 'expired';
                } elseif ($expiry && $expiry->lte($expiryHorizon)) {
                    $status = 'expiring_soon';
                } elseif ($remaining > 0 && $received > 0 && $dispensed / $received >= 0.8) {
                    $status = 'low_stock';
                }

                return [
                    'id'                 => $b->id,
                    'product_id'         => $b->product_id,
                    'product_name'       => $b->product_name,
                    'product_sku'        => $b->product_sku,
                    'batch_number'       => $b->batch_number,
                    'expiry_date'        => $expiry?->toDateString(),
                    'days_to_expiry'     => $daysLeft,
                    'received_quantity'  => $received,
                    'remaining_quantity' => $remaining,
                    'dispensed_quantity' => $dispensed,
                    'original_quantity'  => $quantity,
                    'status'             => $status,
                    'batch_status'       => $b->status,
                    'location'           => $b->location,
                    'supplier_id'        => $b->supplier_id,
                    'created_at'         => $b->created_at
                        ? Carbon::parse($b->created_at)->toDateTimeString()
                        : null,
                ];
            });

            $expired      = $batches->where('status', 'expired')->values();
            $expiringSoon = $batches->where('status', 'expiring_soon')->values();
            $lowStock     = $batches->where('status', 'low_stock')->values();
            $depleted     = $batches->where('status', 'depleted')->values();

            /* ---------- 2. Department movement ---------- */
            $deptMovement = DB::table('department_stock_ledger as l')
                ->join('department_stock_ledger_items as items', 'items.ledger_id', '=', 'l.id')
                ->join('departments as d', 'd.id', '=', 'l.department_id')
                ->where('l.status', 'posted')
                ->when($departmentId, fn($q) => $q->where('l.department_id', $departmentId))
                ->select([
                    'l.department_id',
                    'd.name as department_name',
                    DB::raw("SUM(CASE WHEN items.transaction_type = 'transfer_in'        THEN items.quantity_in  ELSE 0 END) as total_in"),
                    DB::raw("SUM(CASE WHEN items.transaction_type = 'dispensation'       THEN items.quantity_out ELSE 0 END) as total_dispensed"),
                    DB::raw("SUM(CASE WHEN items.transaction_type = 'return_to_pharmacy' THEN items.quantity_out ELSE 0 END) as total_returned"),
                    DB::raw("SUM(CASE WHEN items.transaction_type = 'expired_write_off'  THEN items.quantity_out ELSE 0 END) as total_expired_writeoff"),
                    DB::raw("SUM(CASE WHEN items.transaction_type = 'damaged_loss'       THEN items.quantity_out ELSE 0 END) as total_damaged"),
                ])
                ->groupBy('l.department_id', 'd.name')
                ->get();

            /* ---------- 3. Product movement ---------- */
            $productMovement = DB::table('department_stock_ledger_items as items')
                ->join('department_stock_ledger as l', 'l.id', '=', 'items.ledger_id')
                ->join('products as p', 'p.id', '=', 'items.drug_id')
                ->where('l.status', 'posted')
                ->when($departmentId, fn($q) => $q->where('l.department_id', $departmentId))
                ->select([
                    'items.drug_id as product_id',
                    'p.product_name as product_name',   // ✅
                    'p.product_code as product_sku',    // ✅ was p.sku
                    DB::raw('SUM(items.quantity_in)  as total_in'),
                    DB::raw('SUM(items.quantity_out) as total_out'),
                    DB::raw('COUNT(*) as movement_count'),
                    DB::raw('MAX(items.transaction_date) as last_movement'),
                ])
                ->groupBy('items.drug_id', 'p.product_name', 'p.product_code')  // ✅ was p.sku
                ->orderByDesc('total_out')
                ->limit(50)
                ->get();

            /* ---------- 4. Summary ---------- */
            $summary = [
                'total_batches'       => $batches->count(),
                'total_received'      => $batches->sum('received_quantity'),
                'total_remaining'     => $batches->sum('remaining_quantity'),
                'total_dispensed'     => $batches->sum('dispensed_quantity'),
                'expired_count'       => $expired->count(),
                'expiring_soon_count' => $expiringSoon->count(),
                'low_stock_count'     => $lowStock->count(),
                'depleted_count'      => $depleted->count(),
                'expired_value_units' => $expired->sum('remaining_quantity'),
                'expiring_units'      => $expiringSoon->sum('remaining_quantity'),
            ];

            $departments = DB::table('departments')->select('id', 'name')->orderBy('name')->get();

            return Inertia::render('pharmacies/stock', [
                'summary'         => $summary,
                'batches'         => $batches->values(),
                'expired'         => $expired,
                'expiringSoon'    => $expiringSoon,
                'lowStock'        => $lowStock,
                'depleted'        => $depleted,
                'deptMovement'    => $deptMovement,
                'productMovement' => $productMovement,
                'departments'     => $departments,
                'filters'         => [
                    'department_id' => $departmentId,
                    'expiry_window' => $expiryWindow,
                    'search'        => $search,
                    'show_depleted' => $showDepleted,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('stockMonitoring failed', [
                'error' => $e->getMessage(),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            if ($request->expectsJson() || $request->header('X-Inertia')) {
                return response()->json([
                    'error'   => 'Failed to load stock monitoring.',
                    'message' => config('app.debug') ? $e->getMessage() : null,
                ], 500);
            }
        }
    } 

    protected function applyAdjustment(ProductAdjustment $adjustment): void
{
    // Bulk-store-only: department_id must be null
    if (!$adjustment->bulk_store_id) {
        throw new \InvalidArgumentException('Adjustment must target a bulk store.');
    }

    $product = Product::lockForUpdate()->findOrFail($adjustment->product_id);

    // Opening balance = last ledger closing for this product+bulk_store
    $lastLedger = StockLedger::where('product_id', $product->id)
        ->where('bulk_store_id', $adjustment->bulk_store_id)
        ->orderByDesc('ledger_date')
        ->orderByDesc('id')
        ->lockForUpdate()
        ->first();

    $openingBalance = $lastLedger?->closing_balance ?? 0;
    $delta          = (int) $adjustment->adjustment_difference; // signed
    $closingBalance = $openingBalance + $delta;

    if ($closingBalance < 0 && !$product->allow_negative_stock) {
        throw new \InvalidArgumentException('Adjustment would drive stock negative.');
    }

    // Movement record (audit)
    $movement = StockMovement::create([
        'product_id'      => $product->id,
        'bulk_store_id'   => $adjustment->bulk_store_id,
        'reference_type'  => get_class($adjustment),
        'reference_id'    => $adjustment->id,
        'reference_number'=> $adjustment->adjustment_number,
        'quantity'        => $delta,
        'movement_type'   => $delta > 0 ? 'adjustment_in' : 'adjustment_out',
        'created_by'      => Auth::id(),
    ]);

    // Ledger row
    StockLedger::create([
        'ledger_uuid'      => (string) Str::uuid(),
        'department_id'    => null, // bulk-store-only
        'bulk_store_id'    => $adjustment->bulk_store_id,
        'product_id'       => $product->id,
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

    // Update product aggregate stock
    $product->increment('current_stock', $delta);

    // Mark adjustment applied
    $adjustment->update([
        'status'      => 'approved',
        'approved_by' => Auth::id(),
        'approved_at' => now(),
    ]);
}
}
