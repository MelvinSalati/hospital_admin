<?php

namespace App\Services\Pharmacies;

use App\Models\Patients\{
    Prescription,
    DispensedItem
};
use App\Models\Pharmacies\{
    DepartmentStockLedger,
    DepartmentStockLedgerItem
};
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DispenseService
{
    /** Patient dispense — department ledger only. NEVER touches bulk stock_ledger. */
    const TX_DISPENSE = 'dispensation';

    public function dispense(
        Prescription $prescription,
        array $items,
        int $userId,
        int $departmentId
    ): array { 

    Log::info('prescriptions',[$prescription]);
    Log::info('items',[$items]);
    Log::info('user id',[$userId]);
        return DB::transaction(function () use ($prescription, $items, $userId, $departmentId) {

            $prescription = Prescription::whereKey($prescription->id)->lockForUpdate()->firstOrFail();

            // Key by prescription item ID — the only stable, unique identifier
            $rxItems = $prescription->items()->lockForUpdate()->get()->keyBy('id');

            $ledger = DepartmentStockLedger::create([
                'reference_no'     => 'DSP-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'department_id'    => $departmentId,
                'transaction_type' => self::TX_DISPENSE,
                'transaction_date' => now(),
                'patient_id'       => $prescription->patient_id,
                'prescription_id'  => $prescription->id,
                'status'           => 'posted',
                'remarks'          => "Dispense for {$prescription->prescription_number}",
                'created_by'       => $userId,
                'posted_by'        => $userId,
                'posted_at'        => now(),
            ]);

            $created = [];

            foreach ($items as $row) {
                // Frontend must send prescription_item_id
                $itemId = $row['prescription_item_id'] ?? $row['drug_id'] ?? null;
                $item = $rxItems->get($itemId);

                throw_unless($item, ValidationException::withMessages([
                    'items' => "Prescription item {$itemId} not found on this prescription.",
                ]));

                throw_unless($item->drug_id, ValidationException::withMessages([
                    'items' => "{$item->drug_name} is not linked to a drug record. Link it before dispensing.",
                ]));

                $qty       = (float) ($row['quantity_dispensed'] ?? 0);
                $remaining = (float) $item->quantity_prescribed - (float) $item->quantity_dispensed;

                abort_if($item->dispensation_status === 'completed', 422, "{$item->drug_name} is already fully dispensed.");
                abort_if($qty <= 0, 422, "Quantity must be > 0 for {$item->drug_name}.");
                abort_if($qty > $remaining, 422, "Cannot dispense {$qty} of {$item->drug_name}; only {$remaining} remaining.");

                $allocations = $this->allocateDepartmentBatches(
                    departmentId: $departmentId,
                    drugId: (int) $item->drug_id,
                    qty: $qty,
                );

                $created[] = DispensedItem::create([
                    'prescription_id'      => $prescription->id,
                    'prescription_item_id' => $item->id,
                    'prescription_number'  => $prescription->prescription_number,
                    'drug_name'            => $item->drug_name,
                    'quantity_dispensed'   => $qty,
                    'dispensed_by'         => $userId,
                    'dispensed_at'         => now(),
                    'department_id'        => $departmentId,
                    'ledger_id'            => $ledger->id,
                ]);

                foreach ($allocations as $alloc) {
                    DepartmentStockLedgerItem::create([
                        'ledger_id'        => $ledger->id,
                        'department_id'    => $departmentId,
                        'transaction_type' => self::TX_DISPENSE,
                        'transaction_date' => now(),
                        'drug_id'          => (int) $item->drug_id,
                        'drug_batch_id'    => $alloc['batch_id'],
                        'quantity_in'      => 0,
                        'quantity_out'     => $alloc['qty'],
                        'balance_after'    => $alloc['balance_after'],
                        'unit_cost'        => $alloc['unit_cost'],
                        'total_cost'       => $alloc['unit_cost'] * $alloc['qty'],
                        'remarks'          => "Dispense {$prescription->prescription_number}",
                    ]);
                }

                $item->fill([
                    'quantity_dispensed'  => (float) $item->quantity_dispensed + $qty,
                    'quantity_remaining'  => max(0, (float) $item->quantity_prescribed - ((float) $item->quantity_dispensed + $qty)),
                    'dispensed_by'        => $item->dispensed_by ?? $userId,
                    'dispensed_at'        => now(),
                    'dispensation_status' => ($item->quantity_dispensed + $qty) >= (float) $item->quantity_prescribed ? 'completed' : 'partial',
                ])->save();
            }

            $this->syncPrescriptionStatus($prescription, $userId);

            return $created;
        });
    }

    /**
     * Department balance per batch = SUM(in) - SUM(out) on the DEPARTMENT ledger.
     * Bulk stock_ledger is intentionally excluded.
     */
    private function allocateDepartmentBatches(int $departmentId, int $drugId, float $qty): array
    {
        $rows = DB::table('department_stock_ledger_items as i')
            ->join('department_stock_ledger as l', 'l.id', '=', 'i.ledger_id')
            ->where('i.department_id', $departmentId)
            ->where('i.drug_id', $drugId)
            ->whereNull('l.voided_at')
            ->where('l.status', 'posted')
            ->groupBy('i.drug_batch_id')
            ->selectRaw('
    i.drug_batch_id AS batch_id,
    SUM(i.quantity_in) - SUM(i.quantity_out) AS on_hand,
    MAX(i.unit_cost) AS unit_cost
    ')
            ->get()
            ->keyBy('batch_id');

        if ($rows->isEmpty()) {
            throw ValidationException::withMessages([
                'items' => "No department stock for drug #{$drugId}.",
            ]);
        }

        $batches = DB::table('drug_batches')
            ->whereIn('id', $rows->keys())
            ->orderBy('expiry_date')
            ->get(['id', 'expiry_date']);

        $remaining = $qty;
        $allocations = [];

        foreach ($batches as $batch) {
            if ($remaining <= 0) break;
            $row = $rows->get($batch->id);
            $available = (float) $row->on_hand;
            if ($available <= 0) continue;

            $take = min($available, $remaining);
            $allocations[] = [
                'batch_id' => $batch->id,
                'qty' => $take,
                'unit_cost' => (float) $row->unit_cost,
                'balance_after' => $available - $take,
            ];
            $remaining -= $take;
        }

        if ($remaining > 0) {
            throw ValidationException::withMessages([
                'items' => sprintf(
                    'Insufficient department stock for drug #%d. Short by %.2f.',
                    $drugId,
                    $remaining
                ),
            ]);
        }

        return $allocations;
    }

    public function syncPrescriptionStatus(Prescription $prescription, ?int $userId = null): void
    {
        $items = $prescription->items()->get();
        if ($items->isEmpty()) return;

        $allDone = $items->every(fn($i) => $i->quantity_dispensed >= $i->quantity_prescribed);
        $anyDone = $items->contains(fn($i) => $i->quantity_dispensed > 0);

        $prescription->dispensation_status =
            $allDone ? 'dispensed' : ($anyDone ? 'partial' : 'pending');

        if ($allDone) {
            $prescription->dispensed_at ??= now();
            $prescription->dispensed_by ??= $userId;
        }
        $prescription->save();
    }
}
