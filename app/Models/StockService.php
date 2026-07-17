<?php

namespace App\Services\BulkStores;

use App\Models\BulkStores\BulkStore;
use App\Models\BulkStores\BulkStoreItem;
use App\Models\BulkStores\StockMovement;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class StockService
{
    // -------------------------------------------------------------------------
    // RECEIVE – from supplier into bulk store
    // -------------------------------------------------------------------------

    /**
     * Receive stock from a supplier.
     *
     * @param  array{
     *   bulk_store_id: int,
     *   product_id: int,
     *   supplier_id: int,
     *   quantity: int,
     *   batch_number?: string|null,
     *   expiry_date?: string|null,
     *   unit_cost?: float|null,
     *   reference_number?: string|null,
     *   remarks?: string|null,
     * } $data
     */
    public function receive(array $data): StockMovement
    {
        $this->assertPositiveQuantity($data['quantity']);

        return DB::transaction(function () use ($data): StockMovement {
            $this->incrementStock(
                bulkStoreId: $data['bulk_store_id'],
                productId:   $data['product_id'],
                quantity:    $data['quantity'],
                batchNumber: $data['batch_number'] ?? null,
                expiryDate:  $data['expiry_date']  ?? null,
                unitCost:    $data['unit_cost']     ?? null,
            );

            return StockMovement::create([
                'product_id'       => $data['product_id'],
                'bulk_store_id'    => $data['bulk_store_id'],
                'supplier_id'      => $data['supplier_id'],
                'type'             => 'receiving',
                'quantity'         => $data['quantity'],
                'batch_number'     => $data['batch_number']     ?? null,
                'expiry_date'      => $data['expiry_date']      ?? null,
                'unit_cost'        => $data['unit_cost']        ?? null,
                'reference_number' => $data['reference_number'] ?? null,
                'remarks'          => $data['remarks']          ?? null,
            ]);
        });
    }

    // -------------------------------------------------------------------------
    // ISSUE – from bulk store to department
    // -------------------------------------------------------------------------

    /**
     * Issue stock from a bulk store to a department.
     *
     * @param  array{
     *   bulk_store_id: int,
     *   product_id: int,
     *   to_department_id: int,
     *   quantity: int,
     *   batch_number?: string|null,
     *   reference_number?: string|null,
     *   remarks?: string|null,
     * } $data
     */
    public function issue(array $data): StockMovement
    {
        $this->assertPositiveQuantity($data['quantity']);
        $this->assertSufficientStock(
            $data['bulk_store_id'],
            $data['product_id'],
            $data['quantity'],
            $data['batch_number'] ?? null,
        );

        return DB::transaction(function () use ($data): StockMovement {
            $this->decrementStock(
                bulkStoreId: $data['bulk_store_id'],
                productId:   $data['product_id'],
                quantity:    $data['quantity'],
                batchNumber: $data['batch_number'] ?? null,
            );

            return StockMovement::create([
                'product_id'       => $data['product_id'],
                'bulk_store_id'    => $data['bulk_store_id'],
                'to_department_id' => $data['to_department_id'],
                'type'             => 'issuing',
                'quantity'         => $data['quantity'],
                'batch_number'     => $data['batch_number']     ?? null,
                'reference_number' => $data['reference_number'] ?? null,
                'remarks'          => $data['remarks']          ?? null,
            ]);
        });
    }

    // -------------------------------------------------------------------------
    // TRANSFER – between two bulk stores
    // -------------------------------------------------------------------------

    public function transfer(array $data): StockMovement
    {
        $this->assertPositiveQuantity($data['quantity']);
        $this->assertSufficientStock(
            $data['from_store_id'],
            $data['product_id'],
            $data['quantity'],
            $data['batch_number'] ?? null,
        );

        return DB::transaction(function () use ($data): StockMovement {
            $this->decrementStock(
                bulkStoreId: $data['from_store_id'],
                productId:   $data['product_id'],
                quantity:    $data['quantity'],
                batchNumber: $data['batch_number'] ?? null,
            );

            $this->incrementStock(
                bulkStoreId: $data['to_store_id'],
                productId:   $data['product_id'],
                quantity:    $data['quantity'],
                batchNumber: $data['batch_number'] ?? null,
                expiryDate:  $data['expiry_date']  ?? null,
            );

            return StockMovement::create([
                'product_id'       => $data['product_id'],
                'bulk_store_id'    => $data['from_store_id'],
                'to_department_id' => null,
                'type'             => 'transfer',
                'quantity'         => $data['quantity'],
                'batch_number'     => $data['batch_number'] ?? null,
                'remarks'          => $data['remarks']      ?? null,
            ]);
        });
    }

    // -------------------------------------------------------------------------
    // ADJUST – manual correction
    // -------------------------------------------------------------------------

    /**
     * Adjust stock quantity (positive = add, negative = subtract).
     */
    public function adjust(array $data): StockMovement
    {
        if ($data['quantity'] === 0) {
            throw new InvalidArgumentException('Adjustment quantity cannot be zero.');
        }

        return DB::transaction(function () use ($data): StockMovement {
            $item = BulkStoreItem::where('bulk_store_id', $data['bulk_store_id'])
                                 ->where('product_id', $data['product_id'])
                                 ->where('batch_number', $data['batch_number'] ?? null)
                                 ->lockForUpdate()
                                 ->firstOrFail();

            $newQty = $item->quantity + $data['quantity'];
            if ($newQty < 0) {
                throw new RuntimeException("Adjustment would result in negative stock ({$newQty}).");
            }

            $item->update(['quantity' => $newQty]);

            return StockMovement::create([
                'product_id'    => $data['product_id'],
                'bulk_store_id' => $data['bulk_store_id'],
                'type'          => 'adjustment',
                'quantity'      => abs($data['quantity']),
                'batch_number'  => $data['batch_number'] ?? null,
                'remarks'       => $data['remarks']      ?? null,
            ]);
        });
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function incrementStock(
        int     $bulkStoreId,
        int     $productId,
        int     $quantity,
        ?string $batchNumber,
        ?string $expiryDate = null,
        ?float  $unitCost   = null,
    ): void {
        BulkStoreItem::updateOrCreate(
            [
                'bulk_store_id' => $bulkStoreId,
                'product_id'    => $productId,
                'batch_number'  => $batchNumber,
            ],
            [
                'quantity'    => DB::raw("quantity + {$quantity}"),
                'expiry_date' => $expiryDate,
                'unit_cost'   => $unitCost,
            ]
        );
    }

    private function decrementStock(
        int     $bulkStoreId,
        int     $productId,
        int     $quantity,
        ?string $batchNumber,
    ): void {
        $item = BulkStoreItem::where('bulk_store_id', $bulkStoreId)
                             ->where('product_id', $productId)
                             ->where('batch_number', $batchNumber)
                             ->lockForUpdate()
                             ->firstOrFail();

        $item->decrement('quantity', $quantity);
    }

    private function assertPositiveQuantity(int $quantity): void
    {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Quantity must be a positive integer.');
        }
    }

    private function assertSufficientStock(
        int     $bulkStoreId,
        int     $productId,
        int     $quantity,
        ?string $batchNumber,
    ): void {
        $query = BulkStoreItem::where('bulk_store_id', $bulkStoreId)
                              ->where('product_id', $productId);

        if ($batchNumber) {
            $query->where('batch_number', $batchNumber);
        }

        $available = $query->sum('quantity');

        if ($available < $quantity) {
            throw new RuntimeException(
                "Insufficient stock. Available: {$available}, Requested: {$quantity}."
            );
        }
    }
}
