<?php

namespace App\Http\Controllers\Pharmacies;

use App\Http\Controllers\Controller;
use App\Http\Requests\RequestDispenseDrug;
use App\Models\DrugItem;
use App\Models\Patients\Prescription;
use App\Models\Patients\PrescriptionItem;
use App\Models\BulkStores\DepartmentRequisition;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Services\Pharmacies\DispenseService;
use App\Services\PharmacyService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PharmacyController extends Controller
{
    public function __construct(
        protected PharmacyService $pharmacyService,
        protected DispenseService $dispenseService,
    ) {}

    // =========================================================================
    // Bulk store page (pages/pharmacies/bulkstore.tsx)
    //
    // Props sent here must match the interfaces in the page:
    //   orderedItems      -> OrderedItem[]
    //   expiringProducts  -> ExpiringProduct[]
    //   productBatches    -> ProductBatch[]
    // =========================================================================

    public function bulkstore(int $departmentId)
    {
        /* ---------- 1. Product requests (orderedItems) ---------- */
        $orderedItems = DepartmentRequisition::with([
            'department:id,name',
            'requestedBy:id,name',
            'items.product:id,product_name,product_code',
        ])
            ->where('department_id', $departmentId)
            ->latest('requested_at')
            ->get()
            ->map(function ($req) {
                return [
                    'id'                 => $req->id,
                    'requisition_uuid'   => $req->requisition_uuid,
                    'requisition_number' => $req->requisition_number,
                    'status'             => $req->status,
                    'priority'           => $req->priority,
                    'requested_at'       => $req->requested_at?->toIso8601String(),
                    'required_by_date'   => $req->required_by_date?->format('Y-m-d'),
                    'estimated_total'    => (float) ($req->estimated_total ?? 0),
                    'items_count'        => $req->items->count(),
                    'department'         => $req->department?->name,
                    'requested_by'       => $req->requestedBy?->name,
                    'justification'      => $req->justification,

                    // line items for the details drawer
                    'items' => $req->items->map(function ($item) {
                        return [
                            'id'                   => $item->id,
                            'product_id'           => $item->product_id,
                            'product_name'         => $item->product?->product_name ?? 'Unknown',
                            'product_code'         => $item->product?->product_code,
                            'quantity_requested'   => $item->quantity_requested,
                            'quantity_approved'    => $item->quantity_approved,
                            'quantity_fulfilled'   => $item->quantity_fulfilled,
                            'unit'                 => $item->unit,
                            'estimated_unit_price' => (float) ($item->estimated_unit_price ?? 0),
                            'estimated_total'      => (float) ($item->estimated_total ?? 0),
                            'batch_number'         => $item->batch_number,
                            'expiry_date'          => $item->expiry_date
                                ? Carbon::parse($item->expiry_date)->format('Y-m-d')
                                : null,
                            'status'               => $item->status,
                            'notes'                => $item->notes,
                        ];
                    })->values()->all(),
                ];
            })
            ->values()
            ->all();

        /* ---------- 2. Batches for products this department holds ----------
         * One row per stock batch (no join against ledger rows, so batches are
         * never duplicated), with explicit columns so `id` is the batch id.
         */
        $today = Carbon::today();

        $batchRows = DB::table('stock_batches as sb')
            ->join('products as p', 'p.id', '=', 'sb.product_id')
            ->leftJoin('suppliers as s', 's.id', '=', 'sb.supplier_id')
            ->whereIn('sb.product_id', function ($q) use ($departmentId) {
                $q->select('drug_id')
                    ->from('department_stock_ledger_items')
                    ->where('department_id', $departmentId);
            })
            ->select([
                'sb.id',
                'sb.batch_number',
                'sb.expiry_date',
                'sb.received_quantity',
                'sb.remaining_quantity',
                'sb.created_at',
                'p.product_name',
                'p.product_code',
                's.supplier_name',
            ])
            ->orderBy('sb.expiry_date', 'asc')
            ->get()
            ->map(function ($b) use ($today) {
                $expiry = $b->expiry_date ? Carbon::parse($b->expiry_date)->startOfDay() : null;

                return [
                    'id'                 => $b->id,
                    'product_name'       => $b->product_name,
                    'product_code'       => $b->product_code,
                    'batch_number'       => $b->batch_number,
                    'supplier'           => $b->supplier_name,
                    'quantity_received'  => (int) $b->received_quantity,
                    'quantity_remaining' => (int) $b->remaining_quantity,
                    'unit'               => null,
                    'received_at'        => $b->created_at
                        ? Carbon::parse($b->created_at)->format('d F Y')
                        : null,
                    'expiry_date'        => $expiry?->format('d F Y'),
                    // negative = already expired
                    'days_to_expiry'     => $expiry ? (int) $today->diffInDays($expiry, false) : null,
                ];
            });

        // ExpiringProduct[]: every batch that still has stock and an expiry date,
        // soonest expiry first (already-expired batches come first, as negative days)
        $expiringProducts = $batchRows
            ->filter(fn($b) => $b['quantity_remaining'] > 0
                && $b['days_to_expiry'] !== null)
            ->sortBy('days_to_expiry')
            ->map(fn($b) => [
                'id'             => $b['id'],
                'product_name'   => $b['product_name'],
                'product_code'   => $b['product_code'],
                'batch_number'   => $b['batch_number'],
                'quantity'       => $b['quantity_remaining'],
                'unit'           => $b['unit'],
                'expiry_date'    => $b['expiry_date'],
                'days_to_expiry' => $b['days_to_expiry'],
            ])
            ->values()
            ->all();

        // ProductBatch[]: every batch, without the helper field the page does not use
        $productBatches = $batchRows
            ->map(fn($b) => collect($b)->except('days_to_expiry')->all())
            ->values()
            ->all();

        return Inertia::render('pharmacies/bulkstore', [
            'services'         => \App\Models\Services\Service::all(),
            'orderedItems'     => $orderedItems,
            'expiringProducts' => $expiringProducts,
            'productBatches'   => $productBatches,
        ]);
    }

    // =========================================================================
    // Dispensing queue
    // =========================================================================

    public function index()
    {
        \Illuminate\Support\Facades\Log::info('info ', [$this->dispensedTransactions()]);
        \Illuminate\Support\Facades\Log::info('info ', [$this->dispensedTransactions()]);
        return Inertia::render('pharmacies/queue', [
            'prescriptions' => fn() => $this->queuePrescriptions(),
            'dispensed'     => fn() => $this->dispensedTransactions(),
        ]);
    }

    // Kept so the old /pharmacy/dispensed route keeps working.
    public function getDispensed()
    {
        return Inertia::render('pharmacies/dispensed', [
            'dispensed' => $this->dispensedTransactions(),
        ]);
    }

    public function dispense(RequestDispenseDrug $request, Prescription $prescriptionId)
    {
        $userId = $request->user()?->id ?? 1;

        try {
            $created = $this->dispenseService->dispense(
                prescription: $prescriptionId,
                items: $request->validated()['items'],
                userId: $userId,
                departmentId: (int) $request->department_id,
            );

            return response()->json([
                'success'   => true,
                'dispensed' => $created,
                'count'     => count($created),
                'status'    => $prescriptionId->fresh()->status,
            ], 201);
        } catch (ValidationException $e) {
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
            'drug_name'               => 'required|string|max:255',
            'drug_code'               => 'required|string|max:50|unique:drug_items',
            'generic_name'            => 'nullable|string|max:255',
            'brand_name'              => 'nullable|string|max:255',
            'barcode'                 => 'nullable|string|max:100',
            'therapeutic_class'       => 'nullable|string|max:150',
            'schedule_class'          => 'nullable|string|max:50',
            'strength'                => 'nullable|string|max:100',
            'dosage_form'             => 'required|string|max:100',
            'route_of_administration' => 'nullable|string|max:50',
            'unit_of_measure'         => 'nullable|string|max:50',
            'pack_size'               => 'nullable|integer|min:0',
            'minimum_stock_level'     => 'nullable|integer|min:0',
            'maximum_stock_level'     => 'nullable|integer|min:0',
            'reorder_level'           => 'nullable|integer|min:0',
            'purchase_price'          => 'nullable|numeric|min:0',
            'selling_price'           => 'nullable|numeric|min:0',
            'insurance_price'         => 'nullable|numeric|min:0',
            'is_arv'                  => 'boolean',
            'is_tb_drug'              => 'boolean',
            'is_emergency'            => 'boolean',
            'is_controlled'           => 'boolean',
            'track_batches'           => 'boolean',
            'track_expiry'            => 'boolean',
            'allow_negative_stock'    => 'boolean',
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
            return $this->errorResponse($e);
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

            return response()->json([
                'success' => true,
                'drug'    => array_merge($drug->toArray(), [
                    'current_stock'     => $stockSummary->current_stock ?? 0,
                    'total_received'    => $stockSummary->total_received ?? 0,
                    'total_issued'      => $stockSummary->total_issued ?? 0,
                    'total_transferred' => $stockSummary->total_transferred ?? 0,
                    'total_adjusted'    => $stockSummary->total_adjusted ?? 0,
                    'total_movements'   => $stockSummary->total_movements ?? 0,
                    'transactions'      => $transactions,
                ]),
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function getDrugDetails($id)
    {
        try {
            $drug         = DrugItem::findOrFail($id);
            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');

            return response()->json([
                'success'       => true,
                'drug'          => $drug,
                'current_stock' => $currentStock,
                'transactions'  => $this->movementsQuery($drug->id)->paginate(15),
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function getTransactions($id)
    {
        try {
            return response()->json([
                'success'      => true,
                'transactions' => $this->movementsQuery($id)->paginate(20),
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
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
            $drug         = DrugItem::findOrFail($id);
            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');
            $adjustment   = $request->new_quantity - $currentStock;

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
            return $this->errorResponse($e);
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
            return $this->errorResponse($e);
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
            return $this->errorResponse($e);
        }
    }

    // =========================================================================
    // Dashboard
    // =========================================================================

    public function dashboard()
    {
        $totalProducts     = DrugItem::where('is_active', 1)->count();
        $productsDispensed = StockMovement::where('type', 'issuing')->sum('quantity') * -1;
        $totalTransactions = StockMovement::count();

        $lastMonth         = now()->subMonth();
        $currentMonthTotal = StockMovement::whereMonth('moved_at', now()->month)->whereYear('moved_at', now()->year)->sum('quantity');
        $lastMonthTotal    = StockMovement::whereMonth('moved_at', $lastMonth->month)->whereYear('moved_at', $lastMonth->year)->sum('quantity');
        $productsTrend     = $lastMonthTotal > 0
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
                'totalAmount'   => (float) ($movement->unit_cost * abs($movement->quantity)),
                'status'        => $movement->type === 'receiving' ? 'completed' : 'pending',
                'date'          => $movement->moved_at->format('Y-m-d H:i:s'),
            ]);

        return Inertia::render('pharmacies/dashboard', [
            'stats' => [
                'totalProducts'     => $totalProducts,
                'productsDispensed' => (int) $productsDispensed,
                'totalTransactions' => $totalTransactions,
                'productsTrend'     => $productsTrend,
                'dispensedTrend'    => 8.3,   // TODO: compute
                'transactionsTrend' => 15.2,  // TODO: compute
            ],
            'topDispensedDrugs'  => $topDispensedDrugs,
            'weeklyTrend'        => $weeklyTrend,
            'notifications'      => $this->getNotifications(),
            'recentTransactions' => $recentTransactions,
        ]);
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
                'id'             => $s->id,
                'supplier_code'  => $s->supplier_code,
                'supplier_name'  => $s->supplier_name,
                'contact_person' => $s->contact_person,
                'phone'          => $s->phone,
                'email'          => $s->email,
                'address'        => $s->address,
                'city'           => $s->city,
                'country'        => $s->country,
                'rating'         => $s->rating,
                'is_active'      => $s->is_active,
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
                    'p.product_name as product_name',
                    'p.product_code as product_sku',
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

            $batches = $batchesQuery
                ->orderBy('sb.expiry_date', 'asc')
                ->get()
                ->map(function ($b) use ($today, $expiryHorizon) {
                    $expiry    = $b->expiry_date ? Carbon::parse($b->expiry_date) : null;
                    $daysLeft  = $expiry ? $today->diffInDays($expiry, false) : null;
                    $received  = (int) $b->received_quantity;
                    $remaining = (int) $b->remaining_quantity;
                    $dispensed = max(0, $received - $remaining);

                    $status = 'ok';
                    if ($remaining <= 0) {
                        $status = 'depleted';
                    } elseif ($expiry && $expiry->lt($today)) {
                        $status = 'expired';
                    } elseif ($expiry && $expiry->lte($expiryHorizon)) {
                        $status = 'expiring_soon';
                    } elseif ($received > 0 && $dispensed / $received >= 0.8) {
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
                        'original_quantity'  => (int) $b->quantity,
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
                    'p.product_name as product_name',
                    'p.product_code as product_sku',
                    DB::raw('SUM(items.quantity_in)  as total_in'),
                    DB::raw('SUM(items.quantity_out) as total_out'),
                    DB::raw('COUNT(*) as movement_count'),
                    DB::raw('MAX(items.transaction_date) as last_movement'),
                ])
                ->groupBy('items.drug_id', 'p.product_name', 'p.product_code')
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

            return Inertia::render('pharmacies/stock', [
                'summary'         => $summary,
                'batches'         => $batches->values(),
                'expired'         => $expired,
                'expiringSoon'    => $expiringSoon,
                'lowStock'        => $lowStock,
                'depleted'        => $depleted,
                'deptMovement'    => $deptMovement,
                'productMovement' => $productMovement,
                'departments'     => DB::table('departments')->select('id', 'name')->orderBy('name')->get(),
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

            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'error'   => 'Failed to load stock monitoring.',
                    'message' => config('app.debug') ? $e->getMessage() : null,
                ], 500);
            }

            abort(500, 'Failed to load stock monitoring.');
        }
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private function queuePrescriptions()
    {
        return Prescription::with(['patient', 'Items'])
            ->whereIn('status', ['pending', 'active'])
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
                    'patientName'  => $this->patientName($rx),
                    'patient_id'    => $rx->patient_id,
                    'created_at'    => $rx->created_at?->toIso8601String(),
                    'status'        => $rx->status,
                    'item_count'    => $items->count(),
                    'pending_count' => $pending,
                    'items'         => $items->map(fn(PrescriptionItem $i) => [
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
            })
            ->values();
    }

    private function dispensedTransactions()
    {
        return Prescription::with(['patient', 'Items'])
            ->whereIn('status', ['dispensed'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function (Prescription $rx) {
                // Only what was actually handed out
                $lines = $rx->Items->filter(fn($i) => (float) $i->quantity_dispensed > 0);

                $products = $lines->map(fn($i) => [
                    'name'     => $i->drug_name ?? 'Unknown',
                    'quantity' => (float) $i->quantity_dispensed,
                ])->values();

                // Assumes a unit_price column on prescription items; falls back to 0
                $totalAmount = $lines->sum(
                    fn($i) => (float) $i->quantity_dispensed * (float) ($i->unit_price ?? 0)
                );

                $date = $rx->dispensed_date ?? $rx->updated_at;

                return [
                    'id'            => (string) $rx->id,
                    'rx_number' => $rx->prescription_number,
                    'patientName'   => $this->patientName($rx, 'Unknown Patient'),
                    'token'      => $rx->visit_token,
                    'totalQuantity' => $products->sum('quantity'),
                    'items' => $rx->items,
                    'totalAmount'   => $totalAmount,
                    'status'        => $this->mapStatus($rx->status),
                    'created_at'    =>  Carbon::parse($rx->updated_at)->format("d F Y"),
                    'patientId'     => $rx->patient_id,
                    'patientAge'    => $rx->patient?->date_of_birth
                        ? Carbon::parse($rx->patient->date_of_birth)->age
                        : null,
                    'patientGender' => $rx->patient?->gender,
                    'patientPhone'  => $rx->patient?->phone,
                    'patientEmail'  => $rx->patient?->email,
                    'prescribedBy'  => $rx->prescribed_by ?? 'Dr. Unknown',
                    'dispensedBy'   => $rx->dispensed_by ?? 'Pharm. Unknown',
                    'subtotal'      => $totalAmount,
                    'notes'         => $rx->dispensing_notes ?? $rx->clinical_notes,
                ];
            })
            ->values();
    }

    private function patientName(Prescription $rx, string $fallback = 'Unknown'): string
    {
        return $rx->patient
            ? trim($rx->patient->first_name . ' ' . $rx->patient->last_name)
            : $fallback;
    }

    private function mapStatus(?string $status): string
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

    private function movementsQuery($productId)
    {
        return StockMovement::where('product_id', $productId)
            ->with(['supplier', 'createdBy', 'fromDepartment', 'toDepartment'])
            ->orderBy('moved_at', 'desc');
    }

    private function errorResponse(\Throwable $e, int $status = 500)
    {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
        ], $status);
    }

    private function getNotifications(): array
    {
        $notifications = [];

        // 1. Low stock
        $lowStockCount = 0;
        foreach (DrugItem::where('is_active', 1)->get() as $drug) {
            if ($lowStockCount >= 5) {
                break;
            }

            $currentStock = StockMovement::where('product_id', $drug->id)->sum('quantity');
            $reorder      = $drug->reorder_level ?? $drug->minimum_stock_level ?? 0;

            if ($currentStock > 0 && $currentStock <= $reorder) {
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

        // 2. Expiring within 30 days
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
        $received = StockMovement::where('type', 'receiving')
            ->orderBy('moved_at', 'desc')
            ->with('drug')
            ->limit(3)
            ->get();

        foreach ($received as $movement) {
            $notifications[] = [
                'id'      => 'replenished_' . $movement->id,
                'title'   => 'Stock Replenished',
                'message' => "{$movement->drug->drug_name} has been restocked ({$movement->quantity} units)",
                'type'    => 'success',
                'time'    => $movement->moved_at->format('Y-m-d H:i:s'),
                'read'    => true,
            ];
        }

        // 4. Expired: count distinct products, not movements
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

    private function getColorForIndex(int $index): string
    {
        $colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#F97316', '#14B8A6'];

        return $colors[$index % count($colors)];
    }
}
