<?php

namespace App\Http\Controllers\Dashboards;

use App\Http\Controllers\Controller;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

/**
 * Bulk Store dashboard.
 *
 * Built against easy_billing.sql:
 *  - Stock on hand  = SUM(stock_movements.quantity) per product (issuing/transfer/return are stored negative)
 *  - Unit cost      = latest stock_movements.unit_cost on a receipt, else latest
 *                     purchase_requisition_items.estimated_unit_price (receipt rows have no cost)
 *  - Par level      = products.reorder_level
 *  - Expiry         = goods_received_items (batch_number, expiry_date, quantity_accepted)
 *  - Dept issues    = department_stock_ledger_items (transfer_in) valued at unit cost
 *  - Procurement    = purchase_requisitions raised by the Bulk Store department
 */
class BulkstoreDashboardController extends Controller
{
    private const BULK_DEPARTMENT_ID = 12;
    private const EXPIRY_WINDOW_DAYS = 90;

    /** Per-request cache of Schema::hasColumn checks. */
    private array $columnCache = [];

    public function index(Request $request)
    {
        return Inertia::render('bulkstore/Dashboard', [
            'userName' => $request->user()?->name ?? 'Bulk Store User',
            'stats' => $this->buildStats(),
        ]);
    }

    /** JSON endpoint: same payload as the page's `stats` prop (for polling or fetch). */
    public function data(): JsonResponse
    {
        return response()->json($this->buildStats());
    }

    // =====================================================
    // Main assembly
    // =====================================================

    private function buildStats(): array
    {
        $now = now();
        $today = $now->copy()->startOfDay();
        $monthKey = $now->format('Y-m');

        $products = DB::table('products')
            ->get(['id', 'product_name', 'product_code', 'unit', 'reorder_level', 'therapeutic_class', 'category_id'])
            ->keyBy('id');

        $costs = $this->unitCosts();
        $onHand = $this->bulkMovements()
            ->groupBy('sm.product_id')
            ->selectRaw('sm.product_id, SUM(sm.quantity) as on_hand')
            ->pluck('on_hand', 'product_id')
            ->map(fn($q) => (int) $q);

        $costOf = fn($pid) => (float) ($costs[$pid] ?? 0);

        // ---------- Stock value, SKUs, categories ----------
        $categoryNames = $this->categoryNames();
        $totalValue = 0.0;
        $activeSkus = 0;
        $byCategory = [];

        foreach ($onHand as $pid => $qty) {
            if ($qty <= 0 || ! isset($products[$pid])) {
                continue;
            }
            $value = $qty * $costOf($pid);
            $p = $products[$pid];
            $label = $categoryNames[$p->category_id] ?? ($p->therapeutic_class ?: 'Uncategorised');

            $totalValue += $value;
            $activeSkus++;
            $byCategory[$label]['category'] = $label;
            $byCategory[$label]['sku_count'] = ($byCategory[$label]['sku_count'] ?? 0) + 1;
            $byCategory[$label]['total_value'] = ($byCategory[$label]['total_value'] ?? 0) + $value;
        }

        $inventoryByCategory = collect($byCategory)
            ->sortByDesc('total_value')
            ->map(fn($c) => [
                'category' => $c['category'],
                'sku_count' => (int) $c['sku_count'],
                'total_value' => round($c['total_value'], 2),
            ])->values()->take(6)->all();

        // ---------- Monthly received vs issued + month-on-month change ----------
        [$monthlyMovement, $netThisMonth] = $this->monthlyMovement($costOf, 6, $monthKey);
        $previousValue = $totalValue - $netThisMonth;
        $changePct = $previousValue > 0 ? round($netThisMonth / $previousValue * 100, 1) : 0.0;

        // ---------- Par-level alerts (products.reorder_level) ----------
        $belowPar = $products
            ->filter(fn($p) => (float) $p->reorder_level > 0)
            ->map(function ($p) use ($onHand, $costOf) {
                $stock = max(0, (int) ($onHand[$p->id] ?? 0));
                $par = (int) ceil($p->reorder_level);
                if ($stock >= $par) {
                    return null;
                }
                $ratio = $stock / max(1, $par);

                return [
                    'id' => $p->id,
                    'sku' => $p->product_code ?: 'PRD-' . $p->id,
                    'name' => $p->product_name,
                    'category' => $p->therapeutic_class ?: 'General',
                    'current_stock' => $stock,
                    'par_level' => $par,
                    'unit' => $this->unitLabel($p->unit),
                    'unit_cost' => $costOf($p->id),
                    'status' => $stock === 0 ? 'out_of_stock' : ($ratio <= 0.25 ? 'critical' : 'low_stock'),
                    '_ratio' => $ratio,
                ];
            })
            ->filter()
            ->sortBy('_ratio')
            ->values();

        $outOfStock = $belowPar->where('status', 'out_of_stock')->count();
        $lowStock = $belowPar->count() - $outOfStock;

        $criticalItems = $belowPar->take(5)
            ->map(fn($i) => collect($i)->except('_ratio')->all())
            ->all();

        // ---------- Expiry (from received batches that still have stock) ----------
        $expiring = $this->expiringBatches($products, $onHand, $costOf, $today);

        // ---------- Department requisitions ----------
        [$pendingReqs, $urgentReqs, $recentReqs] = $this->requisitions($costOf);

        // ---------- Procurement (Bulk Store purchase requisitions) ----------
        [$pendingPOs, $activePOs] = $this->procurement();

        return [
            'total_inventory_value' => round($totalValue, 2),
            'inventory_value_change_pct' => $changePct,
            'total_active_skus' => $activeSkus,
            'low_stock_count' => $lowStock,
            'out_of_stock_count' => $outOfStock,
            'expiring_soon_count' => $expiring['count'],
            'expiring_soon_value' => round($expiring['value'], 2),
            'billable_capture_rate' => $this->billableCoverage($onHand),

            'pending_requisitions' => $pendingReqs,
            'urgent_requisitions' => $urgentReqs,
            'pending_purchase_orders' => $pendingPOs,
            'pending_stock_adjustments' => $this->pendingAdjustments(),

            'monthly_stock_movement' => $monthlyMovement,
            'inventory_by_category' => $inventoryByCategory,
            'department_consumption' => $this->departmentConsumption($costOf, $now->copy()->startOfMonth()),

            'critical_stock_items' => $criticalItems,
            'expiring_batches' => $expiring['rows'],
            'recent_requisitions' => $recentReqs,
            'active_purchase_orders' => $activePOs,
        ];
    }

    // =====================================================
    // Stock helpers
    // =====================================================

    /** stock_movements rows that belong to the bulk store (not pharmacy dispensing etc.). */
    private function bulkMovements(): Builder
    {
        return DB::table('stock_movements as sm')->where(function ($q) {
            $q->whereNull('sm.from_department_id')
                ->orWhere('sm.from_department_id', self::BULK_DEPARTMENT_ID);
        });
    }

    /** product_id => latest known unit cost. */
    private function unitCosts()
    {
        $fromRequisitions = DB::table('purchase_requisition_items')
            ->where('estimated_unit_price', '>', 0)
            ->groupBy('product_id')
            ->selectRaw("product_id, SUBSTRING_INDEX(GROUP_CONCAT(estimated_unit_price ORDER BY id DESC), ',', 1) as cost")
            ->pluck('cost', 'product_id');

        $fromReceipts = DB::table('stock_movements')
            ->where('type', 'receiving')
            ->where('unit_cost', '>', 0)
            ->groupBy('product_id')
            ->selectRaw("product_id, SUBSTRING_INDEX(GROUP_CONCAT(unit_cost ORDER BY id DESC), ',', 1) as cost")
            ->pluck('cost', 'product_id');

        // union() keeps the left side on key clashes: receipt cost wins, requisition estimate fills the gaps.
        return $fromReceipts->union($fromRequisitions);
    }

    private function monthlyMovement(callable $costOf, int $months, string $currentKey): array
    {
        $from = now()->copy()->subMonths($months - 1)->startOfMonth();

        $rows = $this->bulkMovements()
            ->where('sm.moved_at', '>=', $from)
            ->groupBy('sm.product_id', 'ym', 'sm.type')
            ->selectRaw("sm.product_id, DATE_FORMAT(sm.moved_at, '%Y-%m') as ym, sm.type, SUM(sm.quantity) as qty")
            ->get();

        $received = $issued = [];
        $net = 0.0;

        foreach ($rows as $r) {
            $value = $r->qty * $costOf($r->product_id);
            if ($r->ym === $currentKey) {
                $net += $value; // every movement type, signed
            }
            if ($r->type === 'receiving' && $r->qty > 0) {
                $received[$r->ym] = ($received[$r->ym] ?? 0) + $value;
            } elseif (in_array($r->type, ['issuing', 'transfer'], true) && $r->qty < 0) {
                $issued[$r->ym] = ($issued[$r->ym] ?? 0) + abs($value);
            }
        }

        $out = [];
        for ($i = 0; $i < $months; $i++) {
            $m = $from->copy()->addMonths($i);
            $key = $m->format('Y-m');
            $out[] = [
                'month' => $m->format('M'),
                'received' => round($received[$key] ?? 0, 2),
                'issued' => round($issued[$key] ?? 0, 2),
            ];
        }

        return [$out, $net];
    }

    private function expiringBatches($products, $onHand, callable $costOf, CarbonInterface $today): array
    {
        $rows = DB::table('goods_received_items as gri')
            ->join('goods_received_notes as grn', 'grn.id', '=', 'gri.grn_id')
            ->whereNotIn('grn.status', ['cancelled', 'rejected'])
            ->whereNull('gri.deleted_at')
            ->whereBetween('gri.expiry_date', [
                $today->toDateString(),
                $today->copy()->addDays(self::EXPIRY_WINDOW_DAYS)->toDateString(),
            ])
            ->orderBy('gri.expiry_date')
            ->get(['gri.id', 'gri.product_id', 'gri.batch_number', 'gri.quantity_accepted', 'gri.expiry_date']);

        $batches = $rows->map(function ($r) use ($products, $onHand, $costOf, $today) {
            $stock = (int) ($onHand[$r->product_id] ?? 0);
            if ($stock <= 0 || ! isset($products[$r->product_id])) {
                return null; // nothing left to expire
            }
            $qty = min((int) $r->quantity_accepted, $stock); // batch balance is not tracked, cap at on-hand
            $p = $products[$r->product_id];

            return [
                'id' => $r->id,
                'sku' => $p->product_code ?: 'PRD-' . $p->id,
                'name' => $p->product_name,
                'batch_number' => $r->batch_number ?: '—',
                'quantity' => $qty,
                'unit' => $this->unitLabel($p->unit),
                'expiry_date' => Carbon::parse($r->expiry_date)->toDateString(),
                'days_remaining' => (int) $today->diffInDays(Carbon::parse($r->expiry_date)->startOfDay()),
                'value_at_risk' => round($qty * $costOf($r->product_id), 2),
            ];
        })->filter()->values();

        return [
            'count' => $batches->count(),
            'value' => (float) $batches->sum('value_at_risk'),
            'rows' => $batches->take(5)->all(),
        ];
    }

    private function categoryNames()
    {
        if ($this->hasColumn('categories', 'name')) {
            return DB::table('categories')->pluck('name', 'id');
        }

        return collect();
    }

    private function unitLabel($unit): string
    {
        return ($unit === null || $unit === '' || is_numeric($unit)) ? 'units' : (string) $unit;
    }

    // =====================================================
    // Requisitions + procurement
    // =====================================================

    /** @return array{0:int,1:int,2:array} pending count, urgent count, latest rows */
    private function requisitions(callable $costOf): array
    {
        $agg = DB::table('department_requisition_items')
            ->groupBy('department_requisition_id')
            ->selectRaw("department_requisition_id as id,
                COUNT(*) as items_count,
                SUM(status = 'pending') as pending_n,
                SUM(status IN ('approved','partially_fulfilled')) as approved_n,
                SUM(status = 'fulfilled') as fulfilled_n")
            ->get()
            ->keyBy('id');

        $pendingIds = $agg->filter(fn($a) => $a->pending_n > 0)->keys();
        $urgent = $this->hasColumn('department_requisitions', 'priority')
            ? DB::table('department_requisitions')
            ->whereIn('id', $agg->filter(fn($a) => $a->pending_n > 0 || $a->approved_n > 0)->keys())
            ->where('priority', 'urgent')->count()
            : 0;

        // Latest 6 requisitions
        $q = DB::table('department_requisitions as r')
            ->leftJoin('departments as d', 'd.id', '=', 'r.department_id')
            ->orderByDesc('r.id')->limit(6);

        $select = ['r.id', 'r.created_at', 'd.name as department'];
        if ($this->hasColumn('department_requisitions', 'priority')) {
            $select[] = 'r.priority';
        }
        if ($this->hasColumn('department_requisitions', 'requested_by')) {
            $q->leftJoin('users as u', 'u.id', '=', 'r.requested_by');
            $select[] = 'u.name as requester';
        }
        $latest = $q->get($select);

        $itemRows = DB::table('department_requisition_items')
            ->whereIn('department_requisition_id', $latest->pluck('id'))
            ->get(['department_requisition_id', 'product_id', 'quantity_requested', 'estimated_unit_price']);

        $recent = $latest->map(function ($r) use ($agg, $itemRows, $costOf) {
            $a = $agg[$r->id] ?? null;
            $total = (int) ($a->items_count ?? 0);
            $status = match (true) {
                $a && $total > 0 && (int) $a->fulfilled_n === $total => 'dispatched',
                $a && $a->fulfilled_n > 0 => 'partially_issued',
                $a && $a->approved_n > 0 => 'approved',
                default => 'pending',
            };
            $value = $itemRows->where('department_requisition_id', $r->id)->sum(
                fn($i) => $i->quantity_requested * ((float) $i->estimated_unit_price ?: $costOf($i->product_id))
            );
            $created = Carbon::parse($r->created_at);

            return [
                'id' => $r->id,
                'req_number' => sprintf('REQ-%d-%06d', $created->year, $r->id),
                'department' => $r->department ?? '—',
                'requested_by' => $r->requester ?? '—',
                'items_count' => $total,
                'estimated_value' => round($value, 2),
                'priority' => ($r->priority ?? null) === 'urgent' ? 'urgent' : 'routine',
                'status' => $status,
                'requested_at' => $created->toIso8601String(),
            ];
        })->all();

        return [$pendingIds->count(), $urgent, $recent];
    }

    /** Bulk Store purchase requisitions shown as the procurement pipeline. */
    private function procurement(): array
    {
        $open = DB::table('purchase_requisitions as pr')
            ->whereNull('pr.deleted_at')
            ->where('pr.department_id', self::BULK_DEPARTMENT_ID)
            ->whereIn('pr.status', ['draft', 'pending', 'approved']);

        $pending = (clone $open)->whereIn('pr.status', ['draft', 'pending'])->count();

        $q = (clone $open)->orderBy('pr.required_date')->limit(5);
        $supplierCol = collect(['name', 'supplier_name', 'company_name'])
            ->first(fn($c) => $this->hasColumn('suppliers', $c));
        $select = ['pr.id', 'pr.pr_number', 'pr.estimated_total', 'pr.required_date', 'pr.status', 'pr.funds_released'];
        if ($supplierCol) {
            $q->leftJoin('suppliers as s', 's.id', '=', 'pr.supplier_id');
            $select[] = "s.{$supplierCol} as supplier";
        }
        $rows = $q->get($select);

        $itemCounts = DB::table('purchase_requisition_items')
            ->whereIn('requisition_id', $rows->pluck('id'))
            ->groupBy('requisition_id')
            ->selectRaw('requisition_id, COUNT(*) as n')
            ->pluck('n', 'requisition_id');

        $list = $rows->map(fn($r) => [
            'id' => $r->id,
            'po_number' => $r->pr_number,
            'supplier' => $r->supplier ?? '—',
            'items_count' => (int) ($itemCounts[$r->id] ?? 0),
            'total_amount' => (float) $r->estimated_total,
            'expected_date' => Carbon::parse($r->required_date ?? now())->toDateString(),
            'status' => in_array($r->status, ['draft', 'pending'], true) ? 'pending_approval' : 'ordered',
        ])->all();

        return [$pending, $list];
    }

    // =====================================================
    // Department consumption, adjustments, billing coverage
    // =====================================================

    private function departmentConsumption(callable $costOf, CarbonInterface $monthStart): array
    {
        $issued = DB::table('department_stock_ledger_items')
            ->where('transaction_type', 'transfer_in')
            ->where('transaction_date', '>=', $monthStart)
            ->where('department_id', '!=', self::BULK_DEPARTMENT_ID)
            ->groupBy('department_id', 'drug_id')
            ->selectRaw('department_id, drug_id, SUM(quantity_in) as qty')
            ->get()
            ->groupBy('department_id')
            ->map(fn($rows) => $rows->sum(fn($r) => $r->qty * $costOf($r->drug_id)));

        if ($issued->isEmpty()) {
            return [];
        }

        $quotas = DB::table('budget_allocations')
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->whereIn('department_id', $issued->keys())
            ->groupBy('department_id')
            ->selectRaw('department_id, SUM(allocated_amount) as quota')
            ->pluck('quota', 'department_id');

        $names = DB::table('departments')->whereIn('id', $issued->keys())->pluck('name', 'id');

        return $issued->map(function ($value, $deptId) use ($quotas, $names) {
            $quota = (float) ($quotas[$deptId] ?? 0);

            return [
                'department' => $names[$deptId] ?? "Dept {$deptId}",
                'allocated_quota' => $quota,
                'issued_value' => round($value, 2),
                'percentage_used' => $quota > 0 ? (int) round($value / $quota * 100) : 0,
            ];
        })->sortByDesc('issued_value')->take(5)->values()->all();
    }

    private function pendingAdjustments(): int
    {
        if ($this->hasColumn('stock_adjustments', 'status')) {
            return DB::table('stock_adjustments')->where('status', 'pending')->count();
        }

        return 0;
    }

    /**
     * There is no bill link on stock_movements, so this reports billing coverage instead:
     * the % of stocked products that are registered as billable services.
     */
    private function billableCoverage($onHand): float
    {
        $stocked = $onHand->filter(fn($q) => $q > 0)->keys();
        if ($stocked->isEmpty() || ! $this->hasColumn('services', 'product_id')) {
            return 0.0;
        }

        $billable = DB::table('services')->whereIn('product_id', $stocked)->distinct()->count('product_id');

        return round($billable / $stocked->count() * 100, 1);
    }

    private function hasColumn(string $table, string $column): bool
    {
        return $this->columnCache["$table.$column"] ??=
            Schema::hasTable($table) && Schema::hasColumn($table, $column);
    }
}
