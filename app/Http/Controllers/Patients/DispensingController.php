<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Models\BulkStores\Product;
use App\Models\DepartmentStock;
use App\Models\Patients\Prescription;
use App\Models\Patients\DispensedItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Inertia\Inertia;

class DispensingController extends Controller
{
    const DEPARTMENT_PHARMACY   = 1;
    const DEPARTMENT_BULK_STORE = 2; // TODO: confirm real id in `departments`

    /* ============================================================
     |  INDEX
     ============================================================ */
    public function index(int $patientId)
    {
        $dispensations = Prescription::where('patient_id', $patientId)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('patients/dispensing', [
            'dispensations' => $dispensations,
        ]);
    }

    /* ============================================================
     |  HELPERS
     ============================================================ */
    private function drugName($drug, $fallbackId = null): string
    {
        return $drug->drug_name
            ?? $drug->name
            ?? $drug->product_name
            ?? ('ID ' . ($fallbackId ?? $drug->id ?? '?'));
    }

    /** Units per pack. Null/0 -> 1 (sold singly). */
    private function packSize($drug): int
    {
        return max(1, (int) ($drug->pack_size ?? 1));
    }

    /** Convert an entered quantity (units or packs) to base units. */
    private function toBaseUnits($drug, $qty, string $unitType = 'unit'): int
    {
        return $unitType === 'pack'
            ? (int) round((float) $qty * $this->packSize($drug))
            : (int) $qty;
    }

    /** ['packs' => 17, 'loose' => 6] */
    private function splitPacks($drug, int $units): array
    {
        $size = $this->packSize($drug);
        $sign = $units < 0 ? -1 : 1;
        $abs  = abs($units);

        return [
            'packs' => $sign * intdiv($abs, $size),
            'loose' => $abs % $size,
        ];
    }

    /** "17 packs + 6 loose", or "14" when the product has no pack size. */
    private function formatQty($drug, int $units): string
    {
        $size = $this->packSize($drug);
        if ($size <= 1) {
            return (string) $units;
        }

        ['packs' => $p, 'loose' => $l] = $this->splitPacks($drug, $units);

        $parts = [];
        if ($p !== 0) $parts[] = $p . ($p === 1 || $p === -1 ? ' pack' : ' packs');
        if ($l !== 0) $parts[] = $l . ' loose';

        return $parts ? implode(' + ', $parts) : '0';
    }

    /** Price is per pack -> cost per base unit. If your prices are already per unit, return $price. */
    private function unitCost($drug, $price): float
    {
        return round(((float) ($price ?? 0)) / $this->packSize($drug), 4);
    }

    /**
     * Lock the department_stocks row, creating it if missing.
     * A new row is seeded from the ledger balance (not 0).
     */
    private function getOrCreateStock(
        Product $drug,
        int $departmentId,
        ?string $batchNumber = null,
        ?string $expiryDate = null,
        string $location = 'Pharmacy'
    ): DepartmentStock {
        $stock = DepartmentStock::where('product_id', $drug->id)
            ->where('department_id', $departmentId)
            ->lockForUpdate()
            ->first();

        if ($stock) {
            return $stock;
        }

        $seed = (int) DB::table('department_stock_ledger_items')
            ->where('department_id', $departmentId)
            ->where('drug_id', $drug->id)
            ->selectRaw('COALESCE(SUM(quantity_in),0) - COALESCE(SUM(quantity_out),0) as bal')
            ->value('bal');

        $created = DepartmentStock::create([
            'product_id'    => $drug->id,
            'department_id' => $departmentId,
            'stock_balance' => (string) $seed,
            'reorder_level' => $drug->reorder_level ?? 10,
            'min_stock'     => $drug->minimum_stock_level ?? 5,
            'max_stock'     => $drug->maximum_stock_level ?? 100,
            'location'      => $location,
            'is_active'     => 1,
            'batch_number'  => $batchNumber,
            'expiry_date'   => $expiryDate,
            'last_updated'  => now(),
        ]);

        return DepartmentStock::whereKey($created->id)->lockForUpdate()->first();
    }

    /* ============================================================
     |  DISPENSE
     |  quantity_dispensed / quantity_prescribed are in `unit_type`
     |  ('unit' = tablets/capsules, default; 'pack' = packs).
     |  Everything stored is in base units.
     ============================================================ */
    public function dispense(Request $request, string $prescriptionNumber)
    {
        $validator = Validator::make($request->all(), [
            'items'                        => 'required|array|min:1',
            'items.*.drug_id'              => 'required|exists:products,id',
            'items.*.drug_name'            => 'required|string',
            'items.*.unit_type'            => 'nullable|in:unit,pack',
            'items.*.quantity_dispensed'   => 'required|integer|min:0',
            'items.*.quantity_prescribed'  => 'required|integer|min:1',
            'items.*.dosage'               => 'nullable|string',
            'items.*.frequency'            => 'nullable|string',
            'items.*.route'                => 'nullable|string',
            'items.*.notes'                => 'nullable|string',
            'items.*.reason_not_dispensed' => 'nullable|string',
            'items.*.batch_number'         => 'nullable|string|max:100',
            'items.*.expiry_date'          => 'nullable|date',
            'dispensed_at'                 => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            return DB::transaction(function () use ($request, $prescriptionNumber) {

                $dispensedAt = Carbon::parse($request->dispensed_at)
                    ->setTimezone(config('app.timezone'))
                    ->format('Y-m-d H:i:s');

                /** @var Prescription|null $prescription */
                $prescription = Prescription::where('prescription_number', $prescriptionNumber)
                    ->where('status', 'active')
                    ->lockForUpdate()
                    ->first();

                if (!$prescription) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Prescription not found or not active',
                    ], 404);
                }

                $pharmacyId = self::DEPARTMENT_PHARMACY;
                $patientId  = $prescription->patient_id;

                Log::info('Dispensing started', [
                    'prescription_number' => $prescriptionNumber,
                    'patient_id'          => $patientId,
                ]);

                $dispensedItemsData = [];
                $itemsDisplay       = [];
                $ledgerIds          = [];
                $statusSummary      = ['dispensed' => 0, 'partially_dispensed' => 0, 'not_dispensed' => 0, 'pending' => 0];
                $stockData          = [];

                foreach ($request->items as $item) {
                    $product  = Product::findOrFail($item['drug_id']);
                    $unitType = $item['unit_type'] ?? 'unit';

                    // Everything below is in BASE UNITS (tablets/capsules)
                    $qtyDispensed  = $this->toBaseUnits($product, $item['quantity_dispensed'], $unitType);
                    $qtyPrescribed = $this->toBaseUnits($product, $item['quantity_prescribed'], $unitType);
                    $qtyRemaining  = max(0, $qtyPrescribed - $qtyDispensed);

                    $status = $qtyDispensed === 0
                        ? 'pending'
                        : ($qtyDispensed < $qtyPrescribed ? 'partially_dispensed' : 'dispensed');

                    $statusSummary[$status]++;

                    $ledgerId = null;
                    if ($qtyDispensed > 0) {
                        $stockResult = $this->removeFromStock(
                            drugId: (int) $item['drug_id'],
                            quantity: $qtyDispensed,
                            prescriptionNumber: $prescriptionNumber,
                            prescriptionId: $prescription->id,
                            patientId: (int) $patientId,
                            departmentId: $pharmacyId,
                            batchNumber: $item['batch_number'] ?? null,
                            expiryDate: $item['expiry_date'] ?? null,
                            dispensedAt: $dispensedAt,
                        );

                        $ledgerId    = $stockResult['ledger_id'];
                        $ledgerIds[] = $ledgerId;

                        $stockData[$item['drug_id']] = [
                            'drug_name'              => $item['drug_name'],
                            'pack_size'              => $this->packSize($product),
                            'balance_before'         => $stockResult['balance_before'],
                            'balance_after'          => $stockResult['balance_after'],
                            'balance_before_display' => $this->formatQty($product, $stockResult['balance_before']),
                            'balance_after_display'  => $this->formatQty($product, $stockResult['balance_after']),
                            'requested'              => $qtyDispensed,
                            'requested_display'      => $this->formatQty($product, $qtyDispensed),
                        ];
                    }

                    $dispensedItemsData[] = [
                        'prescription_number'  => $prescriptionNumber,
                        'prescription_id'      => $prescription->id,
                        'drug_id'              => $item['drug_id'],
                        'drug_name'            => $item['drug_name'],
                        'dosage'               => $item['dosage'] ?? null,
                        'frequency'            => $item['frequency'] ?? null,
                        'route'                => $item['route'] ?? null,
                        'quantity_dispensed'   => $qtyDispensed,
                        'quantity_prescribed'  => $qtyPrescribed,
                        'quantity_remaining'   => $qtyRemaining,
                        'status'               => $status,
                        'notes'                => $item['notes'] ?? null,
                        'reason_not_dispensed' => $item['reason_not_dispensed'] ?? null,
                        'dispensed_by'         => auth()->id(),
                        'dispensed_at'         => $dispensedAt,
                        'created_at'           => now(),
                        'updated_at'           => now(),
                    ];

                    // Display-only (not inserted into the table)
                    $itemsDisplay[] = [
                        'drug_id'                    => $item['drug_id'],
                        'pack_size'                  => $this->packSize($product),
                        'quantity_dispensed_display' => $this->formatQty($product, $qtyDispensed),
                        'quantity_prescribed_display'=> $this->formatQty($product, $qtyPrescribed),
                        'quantity_remaining_display' => $this->formatQty($product, $qtyRemaining),
                    ];

                    Log::info('Dispensing item', [
                        'drug_id'            => $item['drug_id'],
                        'drug_name'          => $item['drug_name'],
                        'unit_type'          => $unitType,
                        'quantity_dispensed' => $qtyDispensed,
                        'status'             => $status,
                        'ledger_id'          => $ledgerId,
                    ]);
                }

                if (!empty($dispensedItemsData)) {
                    DispensedItem::insert($dispensedItemsData);
                }

                $totalItems         = count($request->items);
                $prescriptionStatus = 'pending';

                if ($statusSummary['dispensed'] === $totalItems) {
                    $prescriptionStatus = 'dispensed';
                } elseif ($statusSummary['dispensed'] > 0 || $statusSummary['partially_dispensed'] > 0) {
                    $prescriptionStatus = 'partially_dispensed';
                } elseif ($statusSummary['not_dispensed'] === $totalItems) {
                    $prescriptionStatus = 'not_dispensed';
                }

                $prescription->update([
                    'status'       => $prescriptionStatus,
                    'dispensed_at' => $dispensedAt,
                    'updated_at'   => now(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Dispensation completed successfully',
                    'data'    => [
                        'prescription_number' => $prescriptionNumber,
                        'prescription_id'     => $prescription->id,
                        'status'              => $prescriptionStatus,
                        'items'               => $dispensedItemsData,
                        'items_display'       => $itemsDisplay,
                        'ledger_ids'          => $ledgerIds,
                        'stock_data'          => $stockData,
                        'dispensed_at'        => $dispensedAt,
                        'summary'             => [
                            'total_items'         => $totalItems,
                            'fully_dispensed'     => $statusSummary['dispensed'],
                            'partially_dispensed' => $statusSummary['partially_dispensed'],
                            'not_dispensed'       => $statusSummary['not_dispensed'],
                            'pending'             => $statusSummary['pending'],
                        ],
                    ],
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('Dispensation failed: ' . $e->getMessage(), [
                'prescription_number' => $prescriptionNumber,
                'trace'               => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Dispensation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* ============================================================
     |  CORE: Remove stock (quantity is in BASE UNITS)
     ============================================================ */
    private function removeFromStock(
        int $drugId,
        int $quantity,
        string $prescriptionNumber,
        int $prescriptionId,
        int $patientId,
        int $departmentId,
        ?string $batchNumber,
        ?string $expiryDate,
        string $dispensedAt
    ): array {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('Quantity to remove must be greater than zero.');
        }

        $drug = Product::find($drugId);
        if (!$drug) {
            throw new \Exception("Drug not found: {$drugId}");
        }

        $stock = $this->getOrCreateStock($drug, $departmentId, $batchNumber, $expiryDate);

        $balanceBefore = (int) $stock->stock_balance;

        if (!($drug->allow_negative_stock ?? false) && $balanceBefore < $quantity) {
            throw new \Exception(
                "Insufficient stock for {$this->drugName($drug, $drugId)}. Available: "
                . $this->formatQty($drug, $balanceBefore) . " ({$balanceBefore} units), Requested: "
                . $this->formatQty($drug, $quantity) . " ({$quantity} units)"
            );
        }

        $balanceAfter = $balanceBefore - $quantity;

        $stock->update([
            'stock_balance' => (string) $balanceAfter,
            'last_updated'  => now(),
        ]);

        $now         = now();
        $referenceNo = 'DISP-' . Carbon::parse($dispensedAt)->format('YmdHis')
                     . '-' . strtoupper(Str::random(4));

        $ledgerId = DB::table('department_stock_ledger')->insertGetId([
            'reference_no'              => $referenceNo,
            'department_id'             => $departmentId,
            'counterpart_department_id' => null,
            'transaction_type'          => 'dispensation',
            'transaction_date'          => $dispensedAt,
            'patient_id'                => $patientId,
            'prescription_id'           => $prescriptionId,
            'status'                    => 'posted',
            'remarks'                   => "Dispensed via prescription: {$prescriptionNumber}",
            'created_by'                => auth()->id(),
            'posted_by'                 => auth()->id(),
            'posted_at'                 => $now,
            'created_at'                => $now,
            'updated_at'                => $now,
        ]);

        DB::table('department_stock_ledger_items')->insert([
            'ledger_id'        => $ledgerId,
            'department_id'    => $departmentId,
            'transaction_type' => 'dispensation',
            'transaction_date' => $dispensedAt,
            'drug_id'          => $drugId,
            'drug_batch_id'    => null,
            'quantity_in'      => 0,
            'quantity_out'     => $quantity,
            'balance_after'    => $balanceAfter,
            'unit_cost'        => $this->unitCost($drug, $drug->selling_price),
            'remarks'          => "Dispensed via prescription: {$prescriptionNumber}",
            'created_at'       => $now,
            'updated_at'       => $now,
        ]);

        return [
            'ledger_id'      => $ledgerId,
            'balance_before' => $balanceBefore,
            'balance_after'  => $balanceAfter,
        ];
    }

    /* ============================================================
     |  TRANSFER: Bulk Store -> Pharmacy
     |  items.*.quantity is in `unit_type` (default 'unit')
     ============================================================ */
    public function transferToPharmacy(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items'                => 'required|array|min:1',
            'items.*.drug_id'      => 'required|exists:products,id',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.unit_type'    => 'nullable|in:unit,pack',
            'items.*.batch_number' => 'nullable|string|max:100',
            'items.*.expiry_date'  => 'nullable|date',
            'notes'                => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request) {

                $bulkId  = self::DEPARTMENT_BULK_STORE;
                $pharmId = self::DEPARTMENT_PHARMACY;
                $refNo   = 'TRF-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
                $moved   = [];

                foreach ($request->items as $item) {
                    $drug = Product::findOrFail($item['drug_id']);
                    $qty  = $this->toBaseUnits($drug, $item['quantity'], $item['unit_type'] ?? 'unit');
                    $now  = now();

                    // ---- Bulk side ----
                    $bulkStock  = $this->getOrCreateStock($drug, $bulkId, null, null, 'Bulk Store');
                    $bulkBefore = (int) $bulkStock->stock_balance;

                    if ($bulkBefore < $qty) {
                        throw new \Exception(
                            "Insufficient stock in Bulk Store for {$this->drugName($drug)}. Available: "
                            . $this->formatQty($drug, $bulkBefore) . " ({$bulkBefore} units), Requested: "
                            . $this->formatQty($drug, $qty) . " ({$qty} units)"
                        );
                    }
                    $bulkAfter = $bulkBefore - $qty;

                    $bulkStock->update([
                        'stock_balance' => (string) $bulkAfter,
                        'last_updated'  => $now,
                    ]);

                    $bulkLedgerId = DB::table('department_stock_ledger')->insertGetId([
                        'reference_no'              => $refNo . '-OUT',
                        'department_id'             => $bulkId,
                        'counterpart_department_id' => $pharmId,
                        'transaction_type'          => 'transfer_out',
                        'transaction_date'          => $now,
                        'status'                    => 'posted',
                        'remarks'                   => $request->notes ?? 'Transferred to Pharmacy',
                        'created_by'                => auth()->id(),
                        'posted_by'                 => auth()->id(),
                        'posted_at'                 => $now,
                        'created_at'                => $now,
                        'updated_at'                => $now,
                    ]);

                    DB::table('department_stock_ledger_items')->insert([
                        'ledger_id'        => $bulkLedgerId,
                        'department_id'    => $bulkId,
                        'transaction_type' => 'transfer_out',
                        'transaction_date' => $now,
                        'drug_id'          => $drug->id,
                        'drug_batch_id'    => null,
                        'quantity_in'      => 0,
                        'quantity_out'     => $qty,
                        'balance_after'    => $bulkAfter,
                        'unit_cost'        => $this->unitCost($drug, $drug->purchase_price),
                        'remarks'          => 'Transferred to Pharmacy',
                        'created_at'       => $now,
                        'updated_at'       => $now,
                    ]);

                    // ---- Pharmacy side ----
                    $pharmStock  = $this->getOrCreateStock($drug, $pharmId, $item['batch_number'] ?? null, $item['expiry_date'] ?? null);
                    $pharmBefore = (int) $pharmStock->stock_balance;
                    $pharmAfter  = $pharmBefore + $qty;

                    $pharmStock->update([
                        'stock_balance' => (string) $pharmAfter,
                        'last_updated'  => $now,
                    ]);

                    $pharmLedgerId = DB::table('department_stock_ledger')->insertGetId([
                        'reference_no'              => $refNo . '-IN',
                        'department_id'             => $pharmId,
                        'counterpart_department_id' => $bulkId,
                        'transaction_type'          => 'transfer_in',
                        'transaction_date'          => $now,
                        'status'                    => 'posted',
                        'remarks'                   => $request->notes ?? 'Received from Bulk Store',
                        'created_by'                => auth()->id(),
                        'posted_by'                 => auth()->id(),
                        'posted_at'                 => $now,
                        'created_at'                => $now,
                        'updated_at'                => $now,
                    ]);

                    DB::table('department_stock_ledger_items')->insert([
                        'ledger_id'        => $pharmLedgerId,
                        'department_id'    => $pharmId,
                        'transaction_type' => 'transfer_in',
                        'transaction_date' => $now,
                        'drug_id'          => $drug->id,
                        'drug_batch_id'    => null,
                        'quantity_in'      => $qty,
                        'quantity_out'     => 0,
                        'balance_after'    => $pharmAfter,
                        'unit_cost'        => $this->unitCost($drug, $drug->purchase_price),
                        'remarks'          => 'Received from Bulk Store',
                        'created_at'       => $now,
                        'updated_at'       => $now,
                    ]);

                    $moved[] = [
                        'drug_id'                  => $drug->id,
                        'pack_size'                => $this->packSize($drug),
                        'quantity'                 => $qty,
                        'quantity_display'         => $this->formatQty($drug, $qty),
                        'bulk_balance'             => $bulkAfter,
                        'bulk_balance_display'     => $this->formatQty($drug, $bulkAfter),
                        'pharmacy_balance'         => $pharmAfter,
                        'pharmacy_balance_display' => $this->formatQty($drug, $pharmAfter),
                        'bulk_ledger_id'           => $bulkLedgerId,
                        'pharmacy_ledger_id'       => $pharmLedgerId,
                    ];
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Stock transferred successfully',
                    'data'    => [
                        'reference_number'  => $refNo,
                        'items_transferred' => count($moved),
                        'items'             => $moved,
                    ],
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('Transfer failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => 'Transfer failed: ' . $e->getMessage()], 500);
        }
    }

    /* ============================================================
     |  CHECK STOCK  (quantity in `unit_type`, default 'unit')
     ============================================================ */
    public function checkStockAvailability(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items'             => 'required|array',
            'items.*.drug_id'   => 'required|exists:products,id',
            'items.*.quantity'  => 'required|integer|min:1',
            'items.*.unit_type' => 'nullable|in:unit,pack',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $pharmacyId   = self::DEPARTMENT_PHARMACY;
        $results      = [];
        $allAvailable = true;

        foreach ($request->items as $item) {
            $drug      = Product::find($item['drug_id']);
            $requested = $this->toBaseUnits($drug, $item['quantity'], $item['unit_type'] ?? 'unit');

            $stock = DepartmentStock::where('product_id', $item['drug_id'])
                ->where('department_id', $pharmacyId)
                ->value('stock_balance');

            if ($stock === null) {
                $stock = DB::table('department_stock_ledger_items')
                    ->where('department_id', $pharmacyId)
                    ->where('drug_id', $item['drug_id'])
                    ->selectRaw('COALESCE(SUM(quantity_in),0) - COALESCE(SUM(quantity_out),0) as bal')
                    ->value('bal');
            }
            $stock = (int) $stock;

            $available = ($drug->allow_negative_stock ?? false) || $stock >= $requested;

            $results[] = [
                'drug_id'           => $item['drug_id'],
                'drug_name'         => $drug ? $this->drugName($drug, $item['drug_id']) : 'Unknown',
                'pack_size'         => $this->packSize($drug),
                'current_stock'     => $stock,
                'current_display'   => $this->formatQty($drug, $stock),
                'requested'         => $requested,
                'requested_display' => $this->formatQty($drug, $requested),
                'available'         => $available,
                'allow_negative'    => (bool) ($drug->allow_negative_stock ?? false),
                'message'           => $available
                    ? 'In stock'
                    : 'Insufficient stock. Available: ' . $this->formatQty($drug, $stock) . " ({$stock} units)",
            ];

            if (!$available) $allAvailable = false;
        }

        return response()->json([
            'success' => true,
            'data'    => ['all_available' => $allAvailable, 'items' => $results],
        ]);
    }

    /* ============================================================
     |  MOVEMENTS (read from canonical ledger)
     |  NOTE: these join `drug_items`. If ledger drug_id holds product ids
     |  that don't exist in drug_items, change the join to `products`.
     ============================================================ */
    public function getPharmacyMovements(Request $request)
    {
        $query = DB::table('department_stock_ledger_items as i')
            ->join('department_stock_ledger as h', 'h.id', '=', 'i.ledger_id')
            ->join('drug_items as d', 'd.id', '=', 'i.drug_id')
            ->leftJoin('patients as p', 'p.id', '=', 'h.patient_id')
            ->where('i.department_id', self::DEPARTMENT_PHARMACY)
            ->select(
                'i.id',
                'i.ledger_id',
                'i.transaction_type',
                'i.transaction_date',
                'i.drug_id',
                'd.drug_name',
                'd.drug_code',
                'i.quantity_in',
                'i.quantity_out',
                'i.balance_after',
                'i.unit_cost',
                'h.reference_no',
                'h.patient_id',
                'p.name as patient_name',
                'h.prescription_id',
                'h.remarks',
                'h.status'
            )
            ->orderByDesc('i.transaction_date');

        if ($pid = $request->input('product_id')) {
            $query->where('i.drug_id', $pid);
        }
        if ($pid = $request->input('patient_id')) {
            $query->where('h.patient_id', $pid);
        }
        if ($pn = $request->input('prescription_number')) {
            $query->whereExists(function ($q) use ($pn) {
                $q->select(DB::raw(1))->from('prescriptions')
                    ->whereColumn('prescriptions.id', 'h.prescription_id')
                    ->where('prescriptions.prescription_number', $pn);
            });
        }

        return response()->json(['success' => true, 'data' => $query->paginate(50)]);
    }

    public function getBulkStoreMovements(Request $request)
    {
        $query = DB::table('department_stock_ledger_items as i')
            ->join('department_stock_ledger as h', 'h.id', '=', 'i.ledger_id')
            ->join('drug_items as d', 'd.id', '=', 'i.drug_id')
            ->where('i.department_id', self::DEPARTMENT_BULK_STORE)
            ->select(
                'i.id',
                'i.ledger_id',
                'i.transaction_type',
                'i.transaction_date',
                'i.drug_id',
                'd.drug_name',
                'd.drug_code',
                'i.quantity_in',
                'i.quantity_out',
                'i.balance_after',
                'i.unit_cost',
                'h.reference_no',
                'h.remarks',
                'h.status'
            )
            ->orderByDesc('i.transaction_date');

        if ($pid = $request->input('product_id')) {
            $query->where('i.drug_id', $pid);
        }

        return response()->json(['success' => true, 'data' => $query->paginate(50)]);
    }

    /* ============================================================
     |  STOCK SUMMARY
     ============================================================ */
    public function getPharmacyStockSummary()
    {
        $pharmacyId = self::DEPARTMENT_PHARMACY;

        $stock = DepartmentStock::where('department_id', $pharmacyId)
            ->with('product')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'total_products'     => $stock->count(),
                'total_value'        => $stock->sum(
                    fn($s) => (int) $s->stock_balance * $this->unitCost($s->product, $s->product->selling_price ?? 0)
                ),
                'low_stock_count'    => $stock->filter(fn($s) => (int) $s->stock_balance <= $s->reorder_level && (int) $s->stock_balance > 0)->count(),
                'out_of_stock_count' => $stock->filter(fn($s) => (int) $s->stock_balance <= 0)->count(),
                'items' => $stock->map(function ($s) {
                    $bal   = (int) $s->stock_balance;
                    $split = $this->splitPacks($s->product, $bal);

                    return [
                        'product_id'    => $s->product_id,
                        'product_name'  => $s->product ? $this->drugName($s->product, $s->product_id) : null,
                        'product_code'  => $s->product->drug_code ?? null,
                        'pack_size'     => $this->packSize($s->product),
                        'stock_balance' => $bal,                                   // base units
                        'stock_display' => $this->formatQty($s->product, $bal),    // "17 packs + 6 loose"
                        'packs'         => $split['packs'],
                        'loose'         => $split['loose'],
                        'reorder_level' => $s->reorder_level,                      // base units
                        'status'        => $bal <= 0
                            ? 'Out of Stock'
                            : ($bal <= $s->reorder_level ? 'Low Stock' : 'Adequate'),
                    ];
                }),
            ],
        ]);
    }

    /* ============================================================
     |  HISTORY
     ============================================================ */
    public function getDispensationHistory(int $patientId, string $prescriptionNumber)
    {
        $items = DispensedItem::where('prescription_number', $prescriptionNumber)
            ->orderByDesc('dispensed_at')
            ->orderByDesc('id')
            ->get();

        // Attach pack-friendly display strings
        $products = Product::whereIn('id', $items->pluck('drug_id')->unique())->get()->keyBy('id');

        $items->each(function ($i) use ($products) {
            $p = $products->get($i->drug_id);
            if ($p) {
                $i->pack_size                  = $this->packSize($p);
                $i->quantity_dispensed_display = $this->formatQty($p, (int) $i->quantity_dispensed);
                $i->quantity_prescribed_display = $this->formatQty($p, (int) $i->quantity_prescribed);
                $i->quantity_remaining_display = $this->formatQty($p, (int) $i->quantity_remaining);
            }
        });

        return response()->json([
            'success' => true,
            'data'    => [
                'all_items'          => $items,
                'grouped_by_session' => $items->groupBy(fn($i) => $i->dispensed_at->format('Y-m-d H:i:s')),
                'summary'            => [
                    'total_items_dispensed'           => $items->where('status', 'dispensed')->count(),
                    'total_items_partially_dispensed' => $items->where('status', 'partially_dispensed')->count(),
                    'total_items_not_dispensed'       => $items->where('status', 'not_dispensed')->count(),
                    'total_quantity_dispensed'        => $items->sum('quantity_dispensed'),
                    'total_quantity_prescribed'       => $items->sum('quantity_prescribed'),
                ],
            ],
        ]);
    }

    public function getDispensedItems(int $patientId, string $prescriptionNumber)
    {
        $items = DispensedItem::where('prescription_number', $prescriptionNumber)
            ->orderByDesc('created_at')
            ->get();

        $products = Product::whereIn('id', $items->pluck('drug_id')->unique())->get()->keyBy('id');

        $items->each(function ($i) use ($products) {
            $p = $products->get($i->drug_id);
            if ($p) {
                $i->pack_size                  = $this->packSize($p);
                $i->quantity_dispensed_display = $this->formatQty($p, (int) $i->quantity_dispensed);
                $i->quantity_remaining_display = $this->formatQty($p, (int) $i->quantity_remaining);
            }
        });

        return response()->json(['success' => true, 'data' => $items]);
    }

    /* ============================================================
     |  REVERSE — compensating ledger entry (base units)
     ============================================================ */
    public function reverseDispensation(Request $request, string $prescriptionNumber)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request, $prescriptionNumber) {

                $prescription = Prescription::where('prescription_number', $prescriptionNumber)
                    ->whereIn('status', ['dispensed', 'partially_dispensed'])
                    ->lockForUpdate()
                    ->first();

                if (!$prescription) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Prescription not found or not dispensed',
                    ], 404);
                }

                $dispensedItems = DispensedItem::where('prescription_number', $prescriptionNumber)
                    ->whereNotIn('status', ['not_dispensed', 'reversed'])
                    ->get();

                if ($dispensedItems->isEmpty()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No dispensed items found to reverse',
                    ], 404);
                }

                $pharmacyId  = self::DEPARTMENT_PHARMACY;
                $now         = now();
                $referenceNo = 'REV-' . $now->format('YmdHis') . '-' . Str::upper(Str::random(4));

                $ledgerId = DB::table('department_stock_ledger')->insertGetId([
                    'reference_no'              => $referenceNo,
                    'department_id'             => $pharmacyId,
                    'counterpart_department_id' => null,
                    'transaction_type'          => 'adjustment_in',
                    'transaction_date'          => $now,
                    'patient_id'                => $prescription->patient_id,
                    'prescription_id'           => $prescription->id,
                    'status'                    => 'posted',
                    'remarks'                   => "Reversed dispensation: {$request->reason}",
                    'created_by'                => auth()->id(),
                    'posted_by'                 => auth()->id(),
                    'posted_at'                 => $now,
                    'created_at'                => $now,
                    'updated_at'                => $now,
                ]);

                foreach ($dispensedItems as $item) {
                    $qty = (int) $item->quantity_dispensed; // already base units
                    if ($qty <= 0) continue;

                    $drug = Product::find($item->drug_id);
                    if (!$drug) {
                        throw new \Exception("Drug not found for reversal: {$item->drug_id}");
                    }

                    $stock  = $this->getOrCreateStock($drug, $pharmacyId);
                    $before = (int) $stock->stock_balance;
                    $after  = $before + $qty;

                    $stock->update([
                        'stock_balance' => (string) $after,
                        'last_updated'  => $now,
                    ]);

                    DB::table('department_stock_ledger_items')->insert([
                        'ledger_id'        => $ledgerId,
                        'department_id'    => $pharmacyId,
                        'transaction_type' => 'adjustment_in',
                        'transaction_date' => $now,
                        'drug_id'          => $item->drug_id,
                        'drug_batch_id'    => null,
                        'quantity_in'      => $qty,
                        'quantity_out'     => 0,
                        'balance_after'    => $after,
                        'unit_cost'        => $this->unitCost($drug, $drug->selling_price),
                        'remarks'          => "Reversal: {$request->reason}",
                        'created_at'       => $now,
                        'updated_at'       => $now,
                    ]);
                }

                DispensedItem::where('prescription_number', $prescriptionNumber)
                    ->whereNotIn('status', ['not_dispensed', 'reversed'])
                    ->update([
                        'status'     => 'reversed',
                        'notes'      => DB::raw('CONCAT(COALESCE(notes,\'\'), ' . DB::getPdo()->quote(' | Reversed: ' . $request->reason) . ')'),
                        'updated_at' => $now,
                    ]);

                $prescription->update(['status' => 'active', 'updated_at' => $now]);

                return response()->json([
                    'success' => true,
                    'message' => 'Dispensation reversed successfully',
                    'data'    => [
                        'prescription_number' => $prescriptionNumber,
                        'prescription_id'     => $prescription->id,
                        'items_reversed'      => $dispensedItems->count(),
                        'ledger_id'           => $ledgerId,
                    ],
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('Reverse failed: ' . $e->getMessage(), [
                'prescription_number' => $prescriptionNumber,
                'trace'               => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to reverse dispensation: ' . $e->getMessage(),
            ], 500);
        }
    }
}