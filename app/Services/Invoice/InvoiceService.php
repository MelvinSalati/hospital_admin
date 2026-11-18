<?php

namespace App\Services\Invoice;

use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Central place for invoice operations.
 *
 * Current responsibilities:
 *   - removeItem(): remove one item from an invoice and, depending on the item's
 *     service details, from the source department:
 *
 *       laboratory  -> lab order item
 *       imaging     -> radiology (imaging) order item
 *       pharmacy    -> prescription item
 *       procedure / theater / dental / opthamology / other -> invoice only
 *
 *     It then recalculates the invoice totals and writes an audit_logs row, all in
 *     one transaction.
 *
 * Add new invoice features (create, add item, cancel, payments, ...) as new public
 * methods below, grouped by section, and reuse the private helpers.
 */
class InvoiceService
{
    // ------------------------------------------------------------------
    // SOURCE-DEPARTMENT TABLES: ADJUST TO YOUR SCHEMA (names I could not verify)
    // ------------------------------------------------------------------
    private const LAB = [
        'orders'   => 'lab_orders',
        'items'    => 'lab_order_items',
        'order_fk' => 'lab_order_id',
        'visit_col' => 'visit_token',   // column on the orders table
        'name_col' => 'test_name',      // used when the items table has no service_id
    ];

    private const IMAGING = [
        'orders'   => 'imaging_orders',
        'items'    => 'imaging_order_items',
        'order_fk' => 'imaging_order_id',
        'visit_col' => 'visit_token',
    ];

    private const PRESCRIPTION = [
        'items'    => 'prescription_items',
        'order_fk' => 'prescription_id',
    ];

    /** Invoice statuses that can no longer be edited. */
    private const LOCKED_STATUSES = ['paid', 'partial', 'cancelled'];

    /**
     * Work out what an invoice item is from its service details.
     * Returns: laboratory | imaging | pharmacy | procedure | theater | dental | opthamology | other
     */
    public static function kindOf(array $item): string
    {
        $type = strtolower((string) ($item['type'] ?? ''));
        $cat  = strtolower((string) ($item['service_category'] ?? $item['category'] ?? ''));

        if ($type === 'laboratory' || $cat === 'laboratory') {
            return 'laboratory';
        }
        if ($type === 'imaging' || $cat === 'imaging' || isset($item['imaging_order_item_id'])) {
            return 'imaging';
        }
        if ($type === 'procedure') {
            return 'procedure';
        }
        if (isset($item['drug_id']) || $cat === 'pharmacy') {
            return 'pharmacy';
        }

        return $type !== '' ? $type : 'other';
    }

    // ------------------------------------------------------------------
    // ITEM REMOVAL
    // ------------------------------------------------------------------

    /**
     * @param  int         $invoiceId
     * @param  array       $criteria  kind + any of: service_id, id, imaging_order_item_id,
     *                                patient_procedure_item_id, created_at
     * @param  string|null $reason
     * @return array{invoice: object, removed: array, source: array|null, source_kind: string}
     */
    public function removeItem(int $invoiceId, array $criteria, ?string $reason = null): array
    {
        return DB::transaction(function () use ($invoiceId, $criteria, $reason) {
            $invoice = DB::table('invoices')
                ->where('id', $invoiceId)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->first();

            if (! $invoice) {
                $this->fail('Invoice not found.');
            }

            if (in_array($invoice->status, self::LOCKED_STATUSES, true) || (float) $invoice->paid_amount > 0) {
                $this->fail("This invoice is {$invoice->status} and can no longer be edited. Cancel or refund it instead.");
            }

            $items = json_decode($invoice->items ?? '[]', true);
            if (! is_array($items) || $items === []) {
                $this->fail('This invoice has no items.');
            }

            $index = $this->findIndex($items, $criteria);
            if ($index === null) {
                $this->fail('That item was not found on the invoice. Refresh and try again.');
            }

            $item = $items[$index];
            $kind = self::kindOf($item);

            // ---- 1. remove from the source department (lab / radiology / prescription) ----
            $source = match ($kind) {
                'laboratory' => $this->removeLabItem($invoice, $item),
                'imaging'    => $this->removeImagingItem($invoice, $item),
                'pharmacy'   => $this->removePrescriptionItem($invoice, $item),
                default      => null, // procedure, theater, dental, opthamology, other: invoice only
            };

            // ---- 2. remove from the invoice and recalculate ----
            unset($items[$index]);
            $remaining = array_values($items);

            $oldTotals = $this->totalsOf($invoice);
            $newTotals = $this->recalculate($invoice, $remaining);

            DB::table('invoices')->where('id', $invoice->id)->update([
                'items'      => json_encode($remaining),
                'subtotal'   => $newTotals['subtotal'],
                'tax'        => $newTotals['tax'],
                'discount'   => $newTotals['discount'],
                'total'      => $newTotals['total'],
                'due_amount' => $newTotals['due_amount'],
                'status'     => $remaining === [] ? 'cancelled' : $invoice->status,
                'updated_at' => now(),
            ]);

            // ---- 3. audit ----
            $name = $item['service_name'] ?? $item['name'] ?? $item['drug_name'] ?? 'item';
            $hadResult = $source && (
                ($source['status'] ?? null) === 'completed'
                || ! empty($source['result_value'])
                || ! empty($source['result_file'])
            );

            AuditLog::record('item_removed', 'billing', [
                'table_name' => 'invoices',
                'record_id'  => $invoice->id,
                'old_values' => [
                    'item'    => $item,
                    'source'  => $source,
                    'totals'  => $oldTotals,
                ],
                'new_values' => ['totals' => $newTotals],
                'summary'    => sprintf(
                    'Removed %s "%s" from invoice %s (patient #%d). Total ZMW %s → ZMW %s.%s%s%s',
                    $kind,
                    $name,
                    $invoice->invoice_number,
                    $invoice->patient_id,
                    number_format($oldTotals['total'], 2, '.', ''),
                    number_format($newTotals['total'], 2, '.', ''),
                    $source ? " Also removed from {$kind} order." : ' No source department record changed.',
                    $hadResult ? ' The test already had a result.' : '',
                    $reason ? " Reason: {$reason}" : ''
                ),
                'severity'   => $hadResult ? 'critical' : 'warning',
            ]);

            return [
                'invoice'     => DB::table('invoices')->where('id', $invoice->id)->first(),
                'removed'     => $item,
                'source'      => $source,
                'source_kind' => $kind,
            ];
        });
    }

    // ------------------------------------------------------------------
    // Source removals
    // ------------------------------------------------------------------

    private function removeLabItem(object $invoice, array $item): ?array
    {
        $c = self::LAB;

        if (! $invoice->visit_token) {
            return null;
        }

        $q = DB::table("{$c['items']} as i")
            ->join("{$c['orders']} as o", 'o.id', '=', "i.{$c['order_fk']}")
            ->where("o.{$c['visit_col']}", $invoice->visit_token)
            ->select('i.*');

        if (isset($item['service_id']) && Schema::hasColumn($c['items'], 'service_id')) {
            $q->where('i.service_id', $item['service_id']);
        } else {
            $q->where("i.{$c['name_col']}", $item['service_name'] ?? '');
        }

        $row = $q->orderByDesc('i.id')->lockForUpdate()->first();

        return $row ? $this->deleteRow($c['items'], $row) : null;
    }

    private function removeImagingItem(object $invoice, array $item): ?array
    {
        $c = self::IMAGING;

        // Newer invoices store the exact order item id
        if (! empty($item['imaging_order_item_id'])) {
            $row = DB::table($c['items'])
                ->where('id', $item['imaging_order_item_id'])
                ->lockForUpdate()
                ->first();

            return $row ? $this->deleteRow($c['items'], $row) : null;
        }

        if (! $invoice->visit_token) {
            return null;
        }

        $q = DB::table("{$c['items']} as i")
            ->join("{$c['orders']} as o", 'o.id', '=', "i.{$c['order_fk']}")
            ->where("o.{$c['visit_col']}", $invoice->visit_token)
            ->select('i.*');

        if (isset($item['service_id']) && Schema::hasColumn($c['items'], 'service_id')) {
            $q->where('i.service_id', $item['service_id']);
        }
        if (! empty($item['body_part']) && Schema::hasColumn($c['items'], 'body_part')) {
            $q->where('i.body_part', $item['body_part']);
        }

        $row = $q->orderByDesc('i.id')->lockForUpdate()->first();

        return $row ? $this->deleteRow($c['items'], $row) : null;
    }

    private function removePrescriptionItem(object $invoice, array $item): ?array
    {
        $c = self::PRESCRIPTION;

        if (! $invoice->prescription_id) {
            return null;
        }

        // Invoice item key => prescription items column. First one that exists wins.
        $candidates = ['drug_id' => 'drug_id', 'product_id' => 'product_id', 'service_id' => 'service_id'];

        $q = DB::table($c['items'])->where($c['order_fk'], $invoice->prescription_id);
        $matched = false;

        foreach ($candidates as $itemKey => $column) {
            if (isset($item[$itemKey]) && Schema::hasColumn($c['items'], $column)) {
                $q->where($column, $item[$itemKey]);
                $matched = true;
                break;
            }
        }

        if (! $matched) {
            return null;
        }

        $row = $q->lockForUpdate()->first();
        if (! $row) {
            return null;
        }

        $dispensed = ($item['dispensation_status'] ?? null) === 'dispensed'
            || (($row->dispensation_status ?? null) === 'dispensed')
            || (($row->status ?? null) === 'dispensed');

        if ($dispensed) {
            $this->fail('This drug has already been dispensed and cannot be removed.');
        }

        return $this->deleteRow($c['items'], $row);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function deleteRow(string $table, object $row): array
    {
        $snapshot = (array) $row;
        DB::table($table)->where('id', $row->id)->delete();

        return $snapshot;
    }

    private function findIndex(array $items, array $criteria): ?int
    {
        $keys = ['service_id', 'id', 'imaging_order_item_id', 'patient_procedure_item_id', 'created_at'];

        foreach ($items as $i => $item) {
            if (! empty($criteria['kind']) && self::kindOf($item) !== $criteria['kind']) {
                continue;
            }

            foreach ($keys as $k) {
                if (isset($criteria[$k]) && $criteria[$k] !== '' && (string) ($item[$k] ?? '') !== (string) $criteria[$k]) {
                    continue 2;
                }
            }

            return $i;
        }

        return null;
    }

    private function totalsOf(object $invoice): array
    {
        return [
            'subtotal'   => (float) $invoice->subtotal,
            'tax'        => (float) $invoice->tax,
            'discount'   => (float) $invoice->discount,
            'total'      => (float) $invoice->total,
            'due_amount' => (float) ($invoice->due_amount ?? 0),
        ];
    }

    /**
     * total = subtotal + tax - discount. The existing tax rate on the invoice is kept.
     */
    private function recalculate(object $invoice, array $remaining): array
    {
        $subtotal = round(array_sum(array_map(fn($i) => (float) ($i['total'] ?? 0), $remaining)), 2);

        $oldSubtotal = (float) $invoice->subtotal;
        $rate        = $oldSubtotal > 0 ? ((float) $invoice->tax / $oldSubtotal) : 0;

        $tax      = round($subtotal * $rate, 2);
        $discount = min((float) $invoice->discount, $subtotal);
        $total    = round($subtotal + $tax - $discount, 2);
        $paid     = (float) ($invoice->paid_amount ?? 0);

        return [
            'subtotal'   => $subtotal,
            'tax'        => $tax,
            'discount'   => $discount,
            'total'      => $total,
            'due_amount' => max(0, round($total - $paid, 2)),
        ];
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['item' => $message]);
    }
}
