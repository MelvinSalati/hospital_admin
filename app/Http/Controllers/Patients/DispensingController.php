<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Models\DepartmentStock;
use App\Models\Patients\Prescription;
use App\Models\Patients\DispensedItem;
use App\Models\DrugItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Inertia\Inertia;

class DispensingController extends Controller
{
    /**
     * Department constants
     */
    const DEPARTMENT_BULK_STORE = 1;
    const DEPARTMENT_PHARMACY = 2;

    /**
     * Display a listing of the resource.
     */
    public function index(int $patientId)
    {
        $dispensations = Prescription::where('patient_id', $patientId)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('patients/dispensing', [
            'dispensations' => $dispensations
        ]);
    }

    /**
     * Dispense prescription items
     */
    public function dispense(Request $request, string $prescriptionNumber)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array',
            'items.*.drug_id' => 'required|exists:drug_items,id',
            'items.*.drug_name' => 'required|string',
            'items.*.quantity_dispensed' => 'required|integer|min:0',
            'items.*.quantity_prescribed' => 'required|integer|min:1',
            'items.*.dosage' => 'nullable|string',
            'items.*.frequency' => 'nullable|string',
            'items.*.route' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
            'items.*.reason_not_dispensed' => 'nullable|string',
            'dispensed_at' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $dispensedAt = Carbon::parse($request->dispensed_at)->format('Y-m-d H:i:s');

            $prescription = Prescription::where('prescription_number', $prescriptionNumber)
                ->where('status', 'active')
                ->first();

            if (!$prescription) {
                return response()->json([
                    'success' => false,
                    'message' => 'Prescription not found or not active'
                ], 404);
            }

            Log::info("Dispensing for prescription", ['prescription_number' => $prescriptionNumber]);

            $pharmacyDepartmentId = self::DEPARTMENT_PHARMACY;
            $patientId = $prescription->patient_id;

            // ============================================
            // STEP 1: Validate pharmacy stock availability
            // ============================================
            $stockErrors = [];
            $stockData = [];

            foreach ($request->items as $index => $item) {
                $quantityDispensed = (int) $item['quantity_dispensed'];

                if ($quantityDispensed > 0) {
                    $drug = DrugItem::find($item['drug_id']);
                    if (!$drug) {
                        $stockErrors[] = [
                            'index' => $index,
                            'drug_name' => $item['drug_name'],
                            'message' => 'Drug not found in inventory'
                        ];
                        continue;
                    }

                    // Get current stock in pharmacy department
                    $currentStock = DepartmentStock::where('product_id', $item['drug_id'])
                        ->where('department_id', $pharmacyDepartmentId)
                        ->value('stock_balance') ?? 0;

                    $stockData[$item['drug_id']] = [
                        'drug' => $drug,
                        'current_stock' => $currentStock,
                        'requested' => $quantityDispensed,
                        'allow_negative' => $drug->allow_negative_stock ?? false,
                    ];

                    if (!$drug->allow_negative_stock && $currentStock < $quantityDispensed) {
                        $stockErrors[] = [
                            'index' => $index,
                            'drug_id' => $item['drug_id'],
                            'drug_name' => $item['drug_name'],
                            'current_stock' => $currentStock,
                            'requested' => $quantityDispensed,
                            'message' => "Insufficient stock in pharmacy. Available: {$currentStock}, Requested: {$quantityDispensed}"
                        ];
                    }
                }
            }

            if (!empty($stockErrors)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Stock validation failed',
                    'errors' => $stockErrors,
                    'stock_data' => $stockData
                ], 422);
            }

            // ============================================
            // STEP 2: Process dispensation
            // ============================================
            $dispensedItemsData = [];
            $stockMovements = [];
            $statusSummary = [
                'dispensed' => 0,
                'partially_dispensed' => 0,
                'not_dispensed' => 0
            ];

            foreach ($request->items as $item) {
                $quantityDispensed = (int) $item['quantity_dispensed'];
                $quantityPrescribed = (int) $item['quantity_prescribed'];
                $quantityRemaining = $quantityPrescribed - $quantityDispensed;

                $status = $quantityDispensed == 0 ? 'pending'
                    : ($quantityDispensed < $quantityPrescribed ? 'partially_dispensed' : 'dispensed');

                $statusSummary[$status]++;

                $dispensedItemsData[] = [
                    'prescription_number' => $prescriptionNumber,
                    'prescription_id' => $prescription->id,
                    'drug_id' => $item['drug_id'],
                    'drug_name' => $item['drug_name'],
                    'dosage' => $item['dosage'] ?? null,
                    'frequency' => $item['frequency'] ?? null,
                    'route' => $item['route'] ?? null,
                    'quantity_dispensed' => $quantityDispensed,
                    'quantity_prescribed' => $quantityPrescribed,
                    'quantity_remaining' => $quantityRemaining,
                    'status' => $status,
                    'notes' => $item['notes'] ?? null,
                    'reason_not_dispensed' => $item['reason_not_dispensed'] ?? null,
                    'dispensed_by' => auth()->id(),
                    'dispensed_at' => $dispensedAt,
                    'created_at' => now(),
                    'updated_at' => now()
                ];

                // Update pharmacy stock for dispensed items
                if ($quantityDispensed > 0) {
                    $stockMovement = $this->updatePharmacyStock(
                        $item['drug_id'],
                        $quantityDispensed,
                        $prescriptionNumber,
                        $patientId,
                        $pharmacyDepartmentId,
                        $stockData[$item['drug_id']]['current_stock'] ?? null
                    );
                    if ($stockMovement) {
                        $stockMovements[] = $stockMovement;
                    }
                }

                Log::info("Dispensing item", [
                    'drug_id' => $item['drug_id'],
                    'drug_name' => $item['drug_name'],
                    'quantity_dispensed' => $quantityDispensed,
                    'status' => $status
                ]);
            }

            // Bulk insert dispensed items
            if (!empty($dispensedItemsData)) {
                DispensedItem::insert($dispensedItemsData);
            }

            // Update prescription status
            $totalItems = count($request->items);
            $prescriptionStatus = 'pending';

            if ($statusSummary['dispensed'] == $totalItems) {
                $prescriptionStatus = 'dispensed';
            } elseif ($statusSummary['dispensed'] > 0 || $statusSummary['partially_dispensed'] > 0) {
                $prescriptionStatus = 'partially_dispensed';
            } elseif ($statusSummary['not_dispensed'] == $totalItems) {
                $prescriptionStatus = 'not_dispensed';
            }

            $prescription->update([
                'status' => $prescriptionStatus,
                'dispensed_at' => $dispensedAt,
                'updated_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Dispensation completed successfully',
                'data' => [
                    'prescription_number' => $prescriptionNumber,
                    'prescription_id' => $prescription->id,
                    'status' => $prescriptionStatus,
                    'items' => $dispensedItemsData,
                    'stock_movements' => $stockMovements,
                    'stock_data' => $stockData,
                    'dispensed_at' => $dispensedAt,
                    'summary' => [
                        'total_items' => $totalItems,
                        'fully_dispensed' => $statusSummary['dispensed'],
                        'partially_dispensed' => $statusSummary['partially_dispensed'],
                        'not_dispensed' => $statusSummary['not_dispensed']
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Dispensation failed: ' . $e->getMessage(), [
                'prescription_number' => $prescriptionNumber,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Dispensation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update pharmacy stock when dispensing items
     */
    private function updatePharmacyStock($drugId, $quantity, $prescriptionNumber, $patientId, $pharmacyDepartmentId, $currentStock = null)
    {
        try {
            $drug = DrugItem::find($drugId);
            if (!$drug) {
                Log::warning("Drug not found for stock update", ['drug_id' => $drugId]);
                return null;
            }

            // Get pharmacy stock record
            $pharmacyStock = DepartmentStock::where('product_id', $drugId)
                ->where('department_id', $pharmacyDepartmentId)
                ->first();

            if (!$pharmacyStock) {
                $pharmacyStock = DepartmentStock::create([
                    'product_id' => $drugId,
                    'department_id' => $pharmacyDepartmentId,
                    'stock_balance' => 0,
                    'reorder_level' => $drug->reorder_level ?? 10,
                    'min_stock' => $drug->minimum_stock_level ?? 5,
                    'max_stock' => $drug->maximum_stock_level ?? 100,
                    'location' => 'Pharmacy',
                    'is_active' => 1,
                ]);
            }

            $currentBalance = $pharmacyStock->stock_balance ?? 0;

            // Safety check
            if (!$drug->allow_negative_stock && $currentBalance < $quantity) {
                throw new \Exception("Insufficient stock for {$drug->drug_name}. Available: {$currentBalance}, Requested: {$quantity}");
            }

            $newBalance = $currentBalance - $quantity;

            // Update pharmacy stock
            $pharmacyStock->update([
                'stock_balance' => $newBalance,
                'last_updated' => now()
            ]);

            // Create stock movement in pharmacy movements table
            $movementId = DB::table('stock_movements_pharmacy')->insertGetId([
                'movement_uuid' => (string) Str::uuid(),
                'product_id' => $drugId,
                'from_department_id' => $pharmacyDepartmentId,
                'to_department_id' => null,
                'patient_id' => $patientId,
                'prescription_number' => $prescriptionNumber,
                'created_by' => auth()->id(),
                'type' => 'dispensing',
                'quantity' => -$quantity,
                'balance_after' => $newBalance,
                'reference_number' => 'DISP-' . $prescriptionNumber . '-' . $drugId,
                'batch_number' => null,
                'expiry_date' => null,
                'unit_cost' => $drug->selling_price ?? 0,
                'total_cost' => ($drug->selling_price ?? 0) * $quantity,
                'remarks' => "Dispensed via prescription: {$prescriptionNumber}",
                'moved_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info("Pharmacy stock dispensed", [
                'drug_id' => $drugId,
                'quantity' => -$quantity,
                'balance_after' => $newBalance,
                'prescription_number' => $prescriptionNumber,
                'patient_id' => $patientId,
                'movement_id' => $movementId
            ]);

            return $movementId;
        } catch (\Exception $e) {
            Log::error("Failed to update pharmacy stock: " . $e->getMessage(), [
                'drug_id' => $drugId,
                'quantity' => $quantity,
                'prescription_number' => $prescriptionNumber
            ]);
            throw $e;
        }
    }

    /**
     * Transfer stock from Bulk Store to Pharmacy
     */
    public function transferToPharmacy(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array',
            'items.*.drug_id' => 'required|exists:drug_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.batch_number' => 'nullable|string',
            'items.*.expiry_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $bulkStoreId = self::DEPARTMENT_BULK_STORE;
            $pharmacyId = self::DEPARTMENT_PHARMACY;
            $movements = [];
            $referenceNumber = 'TRF-' . date('Ymd') . '-' . strtoupper(Str::random(6));

            foreach ($request->items as $item) {
                // Check bulk store stock
                $bulkStock = DepartmentStock::where('product_id', $item['drug_id'])
                    ->where('department_id', $bulkStoreId)
                    ->first();

                if (!$bulkStock || $bulkStock->stock_balance < $item['quantity']) {
                    throw new \Exception("Insufficient stock in Bulk Store for drug ID: {$item['drug_id']}");
                }

                $drug = DrugItem::find($item['drug_id']);

                // Update Bulk Store stock (deduct)
                $bulkNewBalance = $bulkStock->stock_balance - $item['quantity'];
                $bulkStock->update([
                    'stock_balance' => $bulkNewBalance,
                    'last_updated' => now()
                ]);

                // Create movement in bulk store movements table
                $bulkMovementId = DB::table('stock_movements_bulkstore')->insertGetId([
                    'movement_uuid' => (string) Str::uuid(),
                    'product_id' => $item['drug_id'],
                    'from_department_id' => $bulkStoreId,
                    'to_department_id' => $pharmacyId,
                    'created_by' => auth()->id(),
                    'type' => 'transfer',
                    'quantity' => -$item['quantity'],
                    'balance_after' => $bulkNewBalance,
                    'reference_number' => $referenceNumber,
                    'batch_number' => $item['batch_number'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'unit_cost' => $drug->purchase_price ?? 0,
                    'remarks' => $request->notes ?? "Transferred to Pharmacy",
                    'moved_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Update Pharmacy stock (add)
                $pharmacyStock = DepartmentStock::where('product_id', $item['drug_id'])
                    ->where('department_id', $pharmacyId)
                    ->first();

                if (!$pharmacyStock) {
                    $pharmacyStock = DepartmentStock::create([
                        'product_id' => $item['drug_id'],
                        'department_id' => $pharmacyId,
                        'stock_balance' => 0,
                        'reorder_level' => $drug->reorder_level ?? 10,
                        'min_stock' => $drug->minimum_stock_level ?? 5,
                        'max_stock' => $drug->maximum_stock_level ?? 100,
                        'location' => 'Pharmacy',
                        'is_active' => 1,
                    ]);
                }

                $pharmacyNewBalance = $pharmacyStock->stock_balance + $item['quantity'];
                $pharmacyStock->update([
                    'stock_balance' => $pharmacyNewBalance,
                    'last_updated' => now()
                ]);

                // Create movement in pharmacy movements table
                $pharmacyMovementId = DB::table('stock_movements_pharmacy')->insertGetId([
                    'movement_uuid' => (string) Str::uuid(),
                    'product_id' => $item['drug_id'],
                    'from_department_id' => $bulkStoreId,
                    'to_department_id' => $pharmacyId,
                    'created_by' => auth()->id(),
                    'type' => 'receiving',
                    'quantity' => $item['quantity'],
                    'balance_after' => $pharmacyNewBalance,
                    'reference_number' => $referenceNumber,
                    'batch_number' => $item['batch_number'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'unit_cost' => $drug->purchase_price ?? 0,
                    'total_cost' => ($drug->purchase_price ?? 0) * $item['quantity'],
                    'remarks' => $request->notes ?? "Received from Bulk Store",
                    'moved_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $movements[] = [
                    'bulk_movement_id' => $bulkMovementId,
                    'pharmacy_movement_id' => $pharmacyMovementId,
                    'product_id' => $item['drug_id'],
                    'quantity' => $item['quantity'],
                ];
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Stock transferred successfully',
                'data' => [
                    'reference_number' => $referenceNumber,
                    'movements' => $movements,
                    'items_transferred' => count($movements)
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Transfer failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Transfer failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check stock availability in pharmacy
     */
    public function checkStockAvailability(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array',
            'items.*.drug_id' => 'required|exists:drug_items,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $pharmacyId = self::DEPARTMENT_PHARMACY;
        $results = [];
        $allAvailable = true;

        foreach ($request->items as $item) {
            $drug = DrugItem::find($item['drug_id']);
            $currentStock = DepartmentStock::where('product_id', $item['drug_id'])
                ->where('department_id', $pharmacyId)
                ->value('stock_balance') ?? 0;

            $isAvailable = ($drug->allow_negative_stock ?? false) || $currentStock >= $item['quantity'];

            $results[] = [
                'drug_id' => $item['drug_id'],
                'drug_name' => $drug->drug_name ?? 'Unknown',
                'current_stock' => $currentStock,
                'requested' => $item['quantity'],
                'available' => $isAvailable,
                'allow_negative' => $drug->allow_negative_stock ?? false,
                'message' => $isAvailable ? 'In stock' : "Insufficient stock. Available: {$currentStock}"
            ];

            if (!$isAvailable) {
                $allAvailable = false;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'all_available' => $allAvailable,
                'items' => $results
            ]
        ]);
    }

    /**
     * Get pharmacy stock movements for a product
     */
    public function getPharmacyMovements(Request $request)
    {
        $productId = $request->input('product_id');
        $patientId = $request->input('patient_id');
        $prescriptionNumber = $request->input('prescription_number');

        $query = DB::table('stock_movements_pharmacy')
            ->join('drug_items', 'stock_movements_pharmacy.product_id', '=', 'drug_items.id')
            ->leftJoin('patients', 'stock_movements_pharmacy.patient_id', '=', 'patients.id')
            ->select(
                'stock_movements_pharmacy.*',
                'drug_items.drug_name',
                'drug_items.drug_code',
                'patients.name as patient_name'
            )
            ->orderBy('moved_at', 'desc');

        if ($productId) {
            $query->where('stock_movements_pharmacy.product_id', $productId);
        }

        if ($patientId) {
            $query->where('stock_movements_pharmacy.patient_id', $patientId);
        }

        if ($prescriptionNumber) {
            $query->where('stock_movements_pharmacy.prescription_number', $prescriptionNumber);
        }

        $movements = $query->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $movements
        ]);
    }

    /**
     * Get bulk store stock movements for a product
     */
    public function getBulkStoreMovements(Request $request)
    {
        $productId = $request->input('product_id');

        $query = DB::table('stock_movements_bulkstore')
            ->join('drug_items', 'stock_movements_bulkstore.product_id', '=', 'drug_items.id')
            ->select(
                'stock_movements_bulkstore.*',
                'drug_items.drug_name',
                'drug_items.drug_code'
            )
            ->orderBy('moved_at', 'desc');

        if ($productId) {
            $query->where('stock_movements_bulkstore.product_id', $productId);
        }

        $movements = $query->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $movements
        ]);
    }

    /**
     * Get current pharmacy stock summary
     */
    public function getPharmacyStockSummary()
    {
        $pharmacyId = self::DEPARTMENT_PHARMACY;

        $stock = DepartmentStock::where('department_id', $pharmacyId)
            ->with('product')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_products' => $stock->count(),
                'total_value' => $stock->sum(function ($s) {
                    return $s->stock_balance * ($s->product->selling_price ?? 0);
                }),
                'low_stock_count' => $stock->filter(function ($s) {
                    return $s->stock_balance <= $s->reorder_level && $s->stock_balance > 0;
                })->count(),
                'out_of_stock_count' => $stock->filter(function ($s) {
                    return $s->stock_balance <= 0;
                })->count(),
                'items' => $stock->map(function ($s) {
                    return [
                        'product_id' => $s->product_id,
                        'product_name' => $s->product->drug_name,
                        'product_code' => $s->product->drug_code,
                        'stock_balance' => $s->stock_balance,
                        'reorder_level' => $s->reorder_level,
                        'status' => $s->stock_balance <= 0 ? 'Out of Stock'
                            : ($s->stock_balance <= $s->reorder_level ? 'Low Stock' : 'Adequate'),
                    ];
                })
            ]
        ]);
    }

    /**
     * Get dispensation history for a prescription
     */
    public function getDispensationHistory(int $patientId, string $prescriptionNumber)
    {
        $dispensedItems = DispensedItem::where('prescription_number', $prescriptionNumber)
            ->orderBy('dispensed_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $groupedBySession = $dispensedItems->groupBy(function ($item) {
            return $item->dispensed_at->format('Y-m-d H:i:s');
        });

        return response()->json([
            'success' => true,
            'data' => [
                'all_items' => $dispensedItems,
                'grouped_by_session' => $groupedBySession,
                'summary' => [
                    'total_items_dispensed' => $dispensedItems->where('status', 'dispensed')->count(),
                    'total_items_partially_dispensed' => $dispensedItems->where('status', 'partially_dispensed')->count(),
                    'total_items_not_dispensed' => $dispensedItems->where('status', 'not_dispensed')->count(),
                    'total_quantity_dispensed' => $dispensedItems->sum('quantity_dispensed'),
                    'total_quantity_prescribed' => $dispensedItems->sum('quantity_prescribed')
                ]
            ]
        ]);
    }

    /**
     * Get dispensed items by prescription
     */
    public function getDispensedItems(int $patientId, string $prescriptionNumber)
    {
        $dispensedItems = DispensedItem::where('prescription_number', $prescriptionNumber)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $dispensedItems
        ]);
    }

    /**
     * Reverse a dispensation (undo dispensing)
     */
    public function reverseDispensation(Request $request, string $prescriptionNumber)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $prescription = Prescription::where('prescription_number', $prescriptionNumber)
                ->whereIn('status', ['dispensed', 'partially_dispensed'])
                ->first();

            if (!$prescription) {
                return response()->json([
                    'success' => false,
                    'message' => 'Prescription not found or not dispensed'
                ], 404);
            }

            $dispensedItems = DispensedItem::where('prescription_number', $prescriptionNumber)
                ->where('status', '!=', 'not_dispensed')
                ->get();

            if ($dispensedItems->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No dispensed items found to reverse'
                ], 404);
            }

            $pharmacyId = self::DEPARTMENT_PHARMACY;

            foreach ($dispensedItems as $item) {
                if ($item->quantity_dispensed > 0) {
                    $drug = DrugItem::find($item->drug_id);
                    if ($drug) {
                        // Get pharmacy stock
                        $pharmacyStock = DepartmentStock::where('product_id', $item->drug_id)
                            ->where('department_id', $pharmacyId)
                            ->first();

                        if ($pharmacyStock) {
                            $newBalance = $pharmacyStock->stock_balance + $item->quantity_dispensed;
                            $pharmacyStock->update([
                                'stock_balance' => $newBalance,
                                'last_updated' => now()
                            ]);

                            // Create reversal movement in pharmacy table
                            DB::table('stock_movements_pharmacy')->insert([
                                'movement_uuid' => (string) Str::uuid(),
                                'product_id' => $item->drug_id,
                                'from_department_id' => null,
                                'to_department_id' => $pharmacyId,
                                'patient_id' => $prescription->patient_id,
                                'prescription_number' => $prescriptionNumber,
                                'created_by' => auth()->id(),
                                'type' => 'adjustment',
                                'quantity' => $item->quantity_dispensed,
                                'balance_after' => $newBalance,
                                'reference_number' => 'REV-' . $prescriptionNumber . '-' . $item->drug_id,
                                'unit_cost' => $drug->selling_price ?? 0,
                                'total_cost' => ($drug->selling_price ?? 0) * $item->quantity_dispensed,
                                'remarks' => "Reversed dispensation: {$request->reason}",
                                'moved_at' => now(),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                }
            }

            DispensedItem::where('prescription_number', $prescriptionNumber)
                ->update([
                    'status' => 'reversed',
                    'notes' => DB::raw("CONCAT(COALESCE(notes, ''), ' | Reversed: {$request->reason}')"),
                    'updated_at' => now()
                ]);

            $prescription->update([
                'status' => 'active',
                'updated_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Dispensation reversed successfully',
                'data' => [
                    'prescription_number' => $prescriptionNumber,
                    'prescription_id' => $prescription->id,
                    'items_reversed' => $dispensedItems->count()
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Reverse dispensation failed: ' . $e->getMessage(), [
                'prescription_number' => $prescriptionNumber
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reverse dispensation: ' . $e->getMessage()
            ], 500);
        }
    }
}
