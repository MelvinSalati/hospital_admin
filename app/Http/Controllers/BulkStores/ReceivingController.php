<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Models\BulkStores\Product;
use App\Models\BulkStores\StockBatch;
use App\Models\BulkStores\StockLedger;
use App\Models\BulkStores\StockMovement;
use App\Models\BulkStores\StockMovementItem;
use App\Models\BulkStores\PurchaseRequisition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ReceivingController extends Controller
{
    public function receiveProduct(Request $request)
    {
        try {
            DB::beginTransaction();

            // Get data from request
            $items = $request->input('items', []);
            $purchaseRequisitionId = $request->input('purchase_requisition_id');
            $purchaseOrderId = $request->input('purchase_order_id');
            $supplierId = $request->input('supplier_id');
            $departmentId = $request->input('department_id', 1);
            $bulkStoreId = $request->input('bulk_store_id');
            $createdBy = $request->input('created_by', auth()->id());

            // Get the purchase requisition for reference
            $requisition = PurchaseRequisition::with('items.product')
                ->findOrFail($purchaseRequisitionId); 
            $updateRequisition = $requisition->update(['status' => 'received']);
            $receivedRecords = [];
            $productTotals = [];

            foreach ($items as $item) {
                // Find product
                $product = Product::findOrFail($item['product_id']);

                // Create stock batch
                $batch = StockBatch::create([
                    'uuid' => (string) Str::uuid(),
                    'product_id' => $product->id,
                    'batch_number' => $item['batch_number'],
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'quantity' => $item['quantity'],
                    'received_quantity' => $item['quantity'],
                    'remaining_quantity' => $item['quantity'],
                    'purchase_order_item_id' => $request->input('purchase_requisition_id'),
                    'supplier_id' => $supplierId,
                    'status' => 'active',
                    'location' => $item['location'] ?? null,
                    'notes' => $item['notes'] ?? null,
                    'created_by' => $createdBy,
                ]);

                // Create stock movement
                $movement = StockMovement::create([
                    'movement_uuid' => (string) Str::uuid(),
                    'product_id' => $product->id,
                    'batch_number' => $item['batch_number'],
                    'type' => StockMovement::TYPE_RECEIVING,
                    'quantity' => $item['quantity'],
                    'reason' => 'Stock receiving from supplier',
                    'notes' => $item['notes'] ?? null,
                    'performed_by' => $createdBy,
                    'approved_by' => $createdBy,
                    'approved_at' => now(),
                ]);

                // Create stock movement item
                StockMovementItem::create([
                    'uuid' => (string) Str::uuid(),
                    'stock_movement_id' => $movement->id,
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'batch_id' => $batch->id,
                    'purchase_order_item_id' => $request->input('purchase_requisition_id'),
                ]);

                // REMOVED: Update product stock - column doesn't exist
                // $product->increment('quantity', $item['quantity']);

                // Track totals for ledger
                if (!isset($productTotals[$product->id])) {
                    $productTotals[$product->id] = [
                        'product_id' => $product->id,
                        'total_quantity' => 0,
                    ];
                }
                $productTotals[$product->id]['total_quantity'] += $item['quantity'];

                $receivedRecords[] = [
                    'batch' => $batch,
                    'movement' => $movement,
                ];
            }

            // Update stock ledger for each product
            foreach ($productTotals as $productId => $data) {
                $this->updateLedger(
                    $productId,
                    $departmentId,
                    $bulkStoreId,
                    $data['total_quantity'],
                    $createdBy
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Products received successfully',
                'data' => [
                    'received_items' => count($receivedRecords),
                    'details' => $receivedRecords,
                    'purchase_requisition_id' => $purchaseRequisitionId,
                ],
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            Log::error('Model not found during receiving process', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Purchase requisition or product not found',
                'error' => config('app.debug') ? $e->getMessage() : 'Resource not found',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error receiving products', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to receive products: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    protected function updateLedger($productId, $departmentId, $bulkStoreId, $quantity, $createdBy)
    {
        $today = now()->toDateString();

        // Get or create today's ledger entry
        $ledger = StockLedger::firstOrCreate(
            [
                'product_id' => $productId,
                'department_id' => $departmentId,
                'ledger_date' => $today,
            ],
            [
                'ledger_uuid' => (string) Str::uuid(),
                'bulk_store_id' => $bulkStoreId,
                'opening_balance' => 0,
                'total_in' => 0,
                'total_out' => 0,
                'closing_balance' => 0,
                'purchases_in' => 0,
                'returns_in' => 0,
                'transfers_in' => 0,
                'adjustments_in' => 0,
                'sales_out' => 0,
                'damage_out' => 0,
                'expiry_out' => 0,
                'transfers_out' => 0,
                'adjustments_out' => 0,
                'movement_count' => 0,
                'unique_batches' => 0,
                'avg_unit_cost' => 0,
                'created_by' => $createdBy,
                'is_verified' => 1,
                'verified_at' => now(),
                'verified_by' => $createdBy,
            ]
        );

        // Get previous day's closing balance
        $previous = StockLedger::where('product_id', $productId)
            ->where('department_id', $departmentId)
            ->where('ledger_date', '<', $today)
            ->orderBy('ledger_date', 'desc')
            ->first();

        $openingBalance = $previous ? $previous->closing_balance : 0;

        // Update ledger
        $ledger->opening_balance = $openingBalance;
        $ledger->total_in = $ledger->total_in + $quantity;
        $ledger->purchases_in = $ledger->purchases_in + $quantity;
        $ledger->closing_balance = $openingBalance + $ledger->total_in - $ledger->total_out;
        $ledger->movement_count = $ledger->movement_count + 1;
        $ledger->unique_batches = $ledger->unique_batches + 1;
        $ledger->updated_by = $createdBy;
        $ledger->save();

        return $ledger;
    }

    protected function generateReferenceNumber(): string
    {
        return 'RCV-' . date('Ymd') . '-' . strtoupper(uniqid());
    }

    public function getReceivedProducts(Request $request)
    {
        $movements = StockMovement::with(['product'])
            ->where('type', StockMovement::TYPE_RECEIVING)
            ->when($request->from_date && $request->to_date, function ($q) use ($request) {
                $q->whereBetween('created_at', [$request->from_date, $request->to_date]);
            })
            ->when($request->product_id, function ($q) use ($request) {
                $q->where('product_id', $request->product_id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 20);

        return response()->json(['success' => true, 'data' => $movements]);
    }

    public function getStockLedger($productId, Request $request)
    {
        $ledgers = StockLedger::with(['product', 'department'])
            ->where('product_id', $productId)
            ->when($request->from_date && $request->to_date, function ($q) use ($request) {
                $q->whereBetween('ledger_date', [$request->from_date, $request->to_date]);
            })
            ->when($request->department_id, function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            })
            ->orderBy('ledger_date', 'desc')
            ->paginate($request->per_page ?? 30);

        return response()->json(['success' => true, 'data' => $ledgers]);
    }

    public function getBatchDetails($batchId)
    {
        $batch = StockBatch::with(['product', 'supplier', 'purchaseOrderItem'])
            ->findOrFail($batchId);

        return response()->json(['success' => true, 'data' => $batch]);
    }
}
