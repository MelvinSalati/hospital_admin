<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Models\BulkStores\StockMovementItem;
use App\Models\BulkStores\StockMovement;
use App\Models\BulkStores\StockLedger;
use App\Models\BulkStores\StockBatch;
use App\Models\BulkStores\Product;
use App\Models\BulkStores\PurchaseRequisition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ReturningController extends Controller
{
    protected StockMovementItem $stockMovementItem;
    protected StockMovement $stockMovement;
    protected StockLedger $stockLedger;
    protected StockBatch $stockBatch;
    protected Product $product;

    public function __construct(
        StockMovementItem $stockMovementItem,
        StockMovement $stockMovement,
        StockLedger $stockLedger,
        StockBatch $stockBatch,
        Product $product
    ) {
        $this->stockMovementItem = $stockMovementItem;
        $this->stockMovement = $stockMovement;
        $this->stockLedger = $stockLedger;
        $this->stockBatch = $stockBatch;
        $this->product = $product;
    }

    /**
     * Return products from inventory
     */
    public function returnProduct(Request $request)
    {
        try {
            DB::beginTransaction();

            // Get data from request
            $items = $request->input('items', []);
            $purchaseRequisitionId = $request->input('purchase_requisition_id');
            $grnId = $request->input('grn_id');
            $createdBy = $request->input('created_by', auth()->id());

            if (empty($items)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No items to return',
                ], 400);
            }

            $returnRecords = [];
            $productTotals = [];
            $departmentId = null;

            // Get requisition for department if available
            if ($purchaseRequisitionId) {
                $requisition = PurchaseRequisition::find($purchaseRequisitionId);
                if ($requisition) {
                    $departmentId = $requisition->department_id;
                }
            }

            foreach ($items as $item) {
                // Get product_id from item or fallback to finding by batch_number
                $productId = $item['product_id'] ?? null;

                if (!$productId) {
                    // Try to find product by batch number
                    $batch = $this->stockBatch
                        ->where('batch_number', $item['batch_number'])
                        ->first();

                    if ($batch) {
                        $productId = $batch->product_id;
                    } else {
                        throw new \Exception("Product ID not provided and batch not found: {$item['batch_number']}");
                    }
                }

                // Find the product
                $product = $this->product->findOrFail($productId);

                // Find the stock batch with the given batch number and product
                $batch = $this->stockBatch
                    ->where('batch_number', $item['batch_number'])
                    ->where('product_id', $product->id)
                    ->first();

                if (!$batch) {
                    throw new \Exception("Batch not found: {$item['batch_number']} for product: {$product->product_name}");
                }

                // Check if there's enough stock in the batch
                if ($batch->remaining_quantity < $item['quantity']) {
                    throw new \Exception("Insufficient stock in batch: {$item['batch_number']}. Available: {$batch->remaining_quantity}, Requested: {$item['quantity']}");
                }

                // Deduct from batch remaining quantity
                $batch->remaining_quantity -= $item['quantity'];
                $batch->save();

                // Update batch status
                $this->updateBatchStatus($batch);

                // Create stock movement for return
                $movement = $this->stockMovement->create([
                    'movement_uuid' => (string) Str::uuid(),
                    'product_id' => $product->id,
                    'batch_number' => $item['batch_number'],
                    'type' => 'return',
                    'quantity' => -$item['quantity'],
                    'reason' => $item['reason'] ?? 'Stock return',
                    'notes' => $item['notes'] ?? null,
                    'performed_by' => $createdBy,
                    'approved_by' => $createdBy,
                    'approved_at' => now(),
                ]);

                // Create stock movement item
                $movementItem = $this->stockMovementItem->create([
                    'uuid' => (string) Str::uuid(),
                    'stock_movement_id' => $movement->id,
                    'product_id' => $product->id,
                    'quantity' => -$item['quantity'],
                    'batch_id' => $batch->id,
                    'purchase_order_item_id' => null,
                    'notes' => $item['notes'] ?? null,
                ]);

                // Update product stock (decrement) - skip if column doesn't exist
                try {
                    $product->decrement('quantity', $item['quantity']);
                } catch (\Exception $e) {
                    Log::warning('Could not decrement product quantity', [
                        'product_id' => $product->id,
                        'error' => $e->getMessage()
                    ]);
                }

                // Track totals for ledger
                if (!isset($productTotals[$product->id])) {
                    $productTotals[$product->id] = [
                        'product_id' => $product->id,
                        'total_quantity' => 0,
                    ];
                }
                $productTotals[$product->id]['total_quantity'] += $item['quantity'];

                $returnRecords[] = [
                    'batch' => $batch,
                    'movement' => $movement,
                    'movement_item' => $movementItem,
                    'product' => $product,
                    'quantity' => $item['quantity'],
                    'reason' => $item['reason'],
                ];
            }

            // Update stock ledger for each product (returns are outbound)
            if ($departmentId) {
                foreach ($productTotals as $productId => $data) {
                    $this->updateLedgerForReturn(
                        $productId,
                        $departmentId,
                        $data['total_quantity'],
                        $createdBy
                    );
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Products returned successfully',
                'data' => [
                    'returned_items' => count($returnRecords),
                    'details' => $returnRecords,
                    'purchase_requisition_id' => $purchaseRequisitionId,
                ],
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            Log::error('Product not found during return process', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
                'error' => config('app.debug') ? $e->getMessage() : 'Resource not found',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error returning products', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to return products: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    /**
     * Update batch status based on remaining quantity
     */
    protected function updateBatchStatus($batch)
    {
        if ($batch->remaining_quantity <= 0) {
            $batch->status = 'depleted';
        } elseif ($batch->remaining_quantity < $batch->quantity) {
            $batch->status = 'partial';
        } else {
            $batch->status = 'active';
        }
        $batch->save();
    }

    /**
     * Update stock ledger for returns
     */
    protected function updateLedgerForReturn($productId, $departmentId, $quantity, $createdBy)
    {
        $today = now()->toDateString();

        // Get or create today's ledger entry
        $ledger = $this->stockLedger->firstOrCreate(
            [
                'product_id' => $productId,
                'department_id' => $departmentId,
                'ledger_date' => $today,
            ],
            [
                'ledger_uuid' => (string) Str::uuid(),
                'opening_balance' => 0,
                'total_in' => 0,
                'total_out' => 0,
                'closing_balance' => 0,
                'returns_out' => 0,
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
        $previous = $this->stockLedger
            ->where('product_id', $productId)
            ->where('department_id', $departmentId)
            ->where('ledger_date', '<', $today)
            ->orderBy('ledger_date', 'desc')
            ->first();

        $openingBalance = $previous ? $previous->closing_balance : 0;

        // Update ledger (returns are outbound)
        $ledger->opening_balance = $openingBalance;
        $ledger->total_out = $ledger->total_out + $quantity;
        $ledger->returns_out = $ledger->returns_out + $quantity;
        $ledger->closing_balance = $openingBalance + $ledger->total_in - $ledger->total_out;
        $ledger->movement_count = $ledger->movement_count + 1;
        $ledger->updated_by = $createdBy;
        $ledger->save();

        return $ledger;
    }

    /**
     * Get return history
     */
    public function getReturnHistory(Request $request)
    {
        try {
            $movements = $this->stockMovement
                ->with(['product', 'performer'])
                ->where('type', 'return')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $movements,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching return history', [
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch return history',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }
}
