<?php

namespace App\Services\BulkStores;

use App\Models\BulkStores\DepartmentRequisition;
use App\Models\BulkStores\DepartmentRequisitionItem;
use App\Models\Pharmacies\DepartmentStockLedger;
use App\Models\User;
use App\Notifications\StockIssuedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProductIssueService
{
    const TX_TRANSFER_OUT = 'transfer_out';
    const TX_TRANSFER_IN  = 'transfer_in';

    public function issue(
        DepartmentRequisitionItem $item,
        float $quantity,
        int $userId,
        string $action = 'issue',
        ?string $comment = null,
    ): ?DepartmentStockLedger {
        return DB::transaction(function () use ($item, $quantity, $userId, $action, $comment) {

            $item = DepartmentRequisitionItem::whereKey($item->id)
                ->lockForUpdate()
                ->firstOrFail();

            $requisition = DepartmentRequisition::whereKey($item->department_requisition_id)
                ->lockForUpdate()
                ->firstOrFail();

            // ── Reject branch ─────────────────────────────────────────
            if ($action === 'reject') {
                $item->quantity_rejected = (float) $item->quantity_rejected + $quantity;
                $item->rejection_reason  = $comment;
                $item->issued_by         = $userId;
                $item->status            = (float) $item->quantity_rejected >= (float) $item->quantity_requested
                    ? 'rejected'
                    : 'partially_rejected';
                $item->save();

                $this->syncRequisitionStatus($requisition, $userId);
                $this->notifyRequestor($requisition, $item, $quantity, $userId, rejected: true, comment: $comment);

                return null;
            }

            // ── Issue branch — validation ────────────────────────────
            $remaining = (float) $item->quantity_requested
                - (float) $item->quantity_fulfilled
                - (float) $item->quantity_rejected;

            abort_if($quantity <= 0, 422, 'Quantity must be greater than zero.');
            abort_if($quantity > $remaining, 422, "Only {$remaining} remaining on this line.");

            $ledger = $this->deductBulkStock((int) $item->product_id, $quantity, $userId);

            $header = $this->addDepartmentStock(
                departmentId: (int) $requisition->department_id,
                productId: (int) $item->product_id,
                qty: $quantity,
                unitCost: (float) ($ledger->avg_unit_cost ?? 0),
                userId: $userId,
                requisition: $requisition,
            );

            $item->quantity_fulfilled = (float) $item->quantity_fulfilled + $quantity;
            $item->issued_by          = $userId;
            $item->status             = (float) $item->quantity_fulfilled >= (float) $item->quantity_requested
                ? 'fulfilled'
                : 'partially_fulfilled';
            $item->save();

            $this->syncRequisitionStatus($requisition, $userId);
            $this->notifyRequestor($requisition, $item, $quantity, $userId);

            return $header;
        });
    }

    private function deductBulkStock(int $productId, float $qty, int $userId): object
    {
        $ledger = DB::table('stock_ledger')
            ->where('product_id', $productId)
            ->whereNull('deleted_at')
            ->lockForUpdate()
            ->orderByDesc('id')
            ->first();

        throw_unless($ledger, ValidationException::withMessages([
            'quantity' => "No stock ledger for product #{$productId}.",
        ]));

        $closing = (float) $ledger->closing_balance;
        abort_if($qty > $closing, 422, "Insufficient stock: only {$closing} on hand.");

        DB::table('stock_ledger')->insert([
            'ledger_uuid'     => (string) Str::uuid(),
            'department_id'   => $ledger->department_id,
            'product_id'      => $productId,
            'ledger_date'     => now()->toDateString(),
            'opening_balance' => $closing,
            'total_in'        => 0,
            'total_out'       => $qty,
            'closing_balance' => $closing - $qty,
            'transfers_out'   => $qty,
            'movement_count'  => 1,
            'avg_unit_cost'   => $ledger->avg_unit_cost,
            'batch_number'    => $ledger->batch_number,
            'created_by'      => $userId,
            'updated_by'      => $userId,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        return $ledger;
    }

    private function addDepartmentStock(
        int $departmentId,
        int $productId,
        float $qty,
        float $unitCost,
        int $userId,
        DepartmentRequisition $requisition,
    ): DepartmentStockLedger {
        $header = DepartmentStockLedger::create([
            'reference_no'     => 'TRF-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
            'department_id'    => $departmentId,
            'transaction_type' => self::TX_TRANSFER_IN,
            'transaction_date' => now(),
            'status'           => 'posted',
            'remarks'          => "Received from bulk store — {$requisition->requisition_number}",
            'created_by'       => $userId,
            'posted_by'        => $userId,
            'posted_at'        => now(),
        ]);

        $header->items()->create([
            'department_id'    => $departmentId,
            'transaction_type' => self::TX_TRANSFER_IN,
            'transaction_date' => now(),
            'drug_id'          => $productId,
            'quantity_in'      => $qty,
            'quantity_out'     => 0,
            'balance_after'    => $qty,
            'unit_cost'        => $unitCost,
            'remarks'          => "Requisition {$requisition->requisition_number}",
        ]);

        return $header;
    }

    private function syncRequisitionStatus(DepartmentRequisition $requisition, int $userId): void
    {
        // Bypass the broken `items()` relation — query the table directly.
        $items = DB::table('department_requisition_items')
            ->where('department_requisition_id', $requisition->id)
            ->get();

        if ($items->isEmpty()) {
            return;
        }

        $allResolved = $items->every(
            fn($i) =>
            (float) $i->quantity_fulfilled + (float) $i->quantity_rejected >= (float) $i->quantity_requested
        );
        $anyProgress = $items->contains(
            fn($i) =>
            (float) $i->quantity_fulfilled + (float) $i->quantity_rejected > 0
        );

        $requisition->status = $allResolved
            ? 'fulfilled'
            : ($anyProgress ? 'partially_fulfilled' : $requisition->status);

        if ($allResolved) {
            $requisition->fulfilled_by = $userId;
            $requisition->fulfilled_at = now();
        }
        $requisition->save();
    }

    private function notifyRequestor(
        DepartmentRequisition $requisition,
        DepartmentRequisitionItem $item,
        float $qty,
        int $userId,
        bool $rejected = false,
        ?string $comment = 'user notified!',
    ): void {
        $user = User::find($requisition->requested_by);
        if (! $user) return;

        $user->notify(new StockIssuedNotification(
            requisitionId: $requisition->id,
            requisitionNo: $requisition->requisition_number,
            departmentId: (int) $requisition->department_id,
            productId: (int) $item->product_id,
            quantity: $qty,
            remaining: (float) $item->quantity_requested
                - (float) $item->quantity_fulfilled
                - (float) $item->quantity_rejected,
            issuedBy: $userId,
            rejected: $rejected,
            comment: $comment,
        ));
    }
}
