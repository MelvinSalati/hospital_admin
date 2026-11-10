<?php

namespace App\Http\Controllers\Dashboards;

use App\Http\Controllers\Controller;
use App\Models\Budgets\BudgetAllocation;
use App\Models\BulkStores\PurchaseRequisition;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Feeds resources/js/pages/admin/dashboard/AdminDashboard.tsx.
 *
 * The page reads TOP-LEVEL snake_case props (DashboardStats), so every key
 * below is spread into the Inertia payload, never nested.
 *
 * Each widget is wrapped in safe(): if one query fails (missing table or
 * column) it logs the error and returns an empty/zero value instead of
 * taking the whole dashboard down.
 */
class AdminDashboardController extends Controller
{
    public function dashboard()
    {
        $budget = self::safe(fn() => self::budgetSummary(), [
            'total_budget'                  => 0,
            'total_utilized'                => 0,
            'total_remaining'               => 0,
            'budget_utilization_percentage' => 0,
        ]);

        $pending = self::safe(fn() => self::pendingCounts(), [
            'pending_approvals'       => 0,
            'pending_purchase_orders' => 0,
            'pending_requisitions'    => 0,
        ]);

        return Inertia::render('admin/Dashboard', [
            ...$budget,
            ...$pending,
            'recent_activities'   => self::safe(fn() => self::recentActivities()),
            'top_services'        => self::safe(fn() => self::topServices()),
            'payment_methods'     => self::safe(fn() => self::paymentMethods()),
            'staff_by_department' => self::safe(fn() => self::staffByDepartment()),
            'insurance_claims'    => self::safe(fn() => self::insuranceClaims()),
            'new_registrations'   => self::safe(fn() => self::newRegistrations()),
        ]);
    }

    // ------------------------------------------------------------------
    // Budget cards + doughnut
    //   total_utilized  = reserved + committed + actual_spent
    //   total_remaining = allocated - total_utilized (so the doughnut adds up)
    // ------------------------------------------------------------------
    private static function budgetSummary(): array
    {
        $t = BudgetAllocation::query()
            ->where('status', BudgetAllocation::STATUS_ACTIVE)
            ->selectRaw('
                COALESCE(SUM(allocated_amount), 0) AS allocated,
                COALESCE(SUM(reserved_amount),  0) AS reserved,
                COALESCE(SUM(committed_amount), 0) AS committed,
                COALESCE(SUM(actual_spent),     0) AS spent
            ')
            ->first();

        $allocated = (float) $t->allocated;
        $used      = (float) $t->reserved + (float) $t->committed + (float) $t->spent;

        return [
            'total_budget'                  => $allocated,
            'total_utilized'                => round($used, 2),
            'total_remaining'               => round(max(0, $allocated - $used), 2),
            'budget_utilization_percentage' => $allocated > 0 ? round($used / $allocated * 100, 1) : 0,
        ];
    }

    // ------------------------------------------------------------------
    // Pending approvals card
    //   requisitions    = PRs awaiting approval
    //   purchase orders = approved PRs whose funds are not released yet
    // ------------------------------------------------------------------
    private static function pendingCounts(): array
    {
        $requisitions = PurchaseRequisition::where('status', 'pending')->count();

        $purchaseOrders = PurchaseRequisition::where('status', 'approved')
            ->where(fn($q) => $q->where('funds_released', false)->orWhereNull('funds_released'))
            ->count();

        return [
            'pending_approvals'       => $requisitions + $purchaseOrders,
            'pending_purchase_orders' => $purchaseOrders,
            'pending_requisitions'    => $requisitions,
        ];
    }

    // ------------------------------------------------------------------
    // Recent approvals & activity (built from purchase requisitions)
    // ------------------------------------------------------------------
    private static function recentActivities(): array
    {
        return PurchaseRequisition::with('requester:id,name')
            ->latest('updated_at')
            ->limit(15)
            ->get()
            ->map(function ($pr) {
                $released = (bool) $pr->funds_released;

                return [
                    'id'          => $pr->id,
                    'type'        => $released ? 'Fund release' : 'Requisition',
                    'description' => sprintf(
                        '%s %s (ZMW %s)',
                        $pr->pr_number,
                        $released ? 'funds released' : $pr->status,
                        number_format((float) $pr->estimated_total, 2)
                    ),
                    'status'      => $released ? 'completed' : (string) $pr->status,
                    'date'        => self::iso($pr->updated_at),
                    'user'        => $pr->requester->name ?? 'System',
                ];
            })
            ->all();
    }


    // ------------------------------------------------------------------
    // Top services (all time): fully paid invoices only
    // ------------------------------------------------------------------
    private static function topServices(): array
    {
        return Cache::remember('dashboard:top-services', 300, function () {
            $labels = [
                'Pharmacy'     => 'Pharmacy Dispensing',
                'Consultation' => 'Outpatient Consultation',
                'Laboratory'   => 'Laboratory Tests',
                'Imaging'      => 'Imaging / X-Ray',
            ];

            $counts = [];

            DB::table('invoices')
                ->whereNull('invoices.deleted_at')
                ->whereExists(function ($q) {
                    $q->select(DB::raw(1))
                        ->from('payments')
                        ->whereColumn('payments.invoice_id', 'invoices.id')
                        ->where('payments.status', 'completed');
                })
                ->whereRaw("(SELECT COALESCE(SUM(p.paid_amount), 0)
                             FROM payments p
                             WHERE p.invoice_id = invoices.id AND p.status = 'completed') >= invoices.total")
                ->select(['invoices.id', 'invoices.items'])
                ->chunkById(500, function ($invoices) use (&$counts) {
                    foreach ($invoices as $invoice) {
                        $items = json_decode($invoice->items ?? '[]', true) ?: [];

                        foreach ($items as $item) {
                            $area = trim((string) ($item['service_area'] ?? $item['category'] ?? ''));
                            $area = $area === '' ? 'Other' : Str::title($area);

                            $counts[$area] = ($counts[$area] ?? 0) + 1;
                        }
                    }
                }, 'invoices.id', 'id');

            arsort($counts);

            return collect($counts)
                ->take(5)
                ->map(fn($count, $area) => [
                    'name'  => $labels[$area] ?? $area,
                    'count' => (int) $count,
                ])
                ->values()
                ->all();
        });
    }


    // ------------------------------------------------------------------
    // Payment methods this week (completed payments)
    // ------------------------------------------------------------------
    private static function paymentMethods(): array
    {
        $labels = [
            'cash'         => 'Cash',
            'mobile_money' => 'Mobile Money',
            'insurance'    => 'Insurance',
            'credit_card'  => 'Card',
            'card'         => 'Card',
        ];

        $rows = DB::table('payments')
            ->where('status', 'completed')
            ->selectRaw('payment_method, COUNT(*) AS n')
            ->groupBy('payment_method')
            ->get();

        $counts = [];
        foreach ($rows as $row) {
            $label = $labels[$row->payment_method] ?? 'Other';
            $counts[$label] = ($counts[$label] ?? 0) + (int) $row->n;
        }

        arsort($counts);

        return collect($counts)
            ->map(fn($count, $name) => ['name' => $name, 'count' => $count])
            ->values()
            ->all();
    }

    // ------------------------------------------------------------------
    // Active staff grouped by department
    // ------------------------------------------------------------------
    private static function staffByDepartment(): array
    {
        return DB::table('user_profiles')
            ->leftJoin('departments', 'departments.id', '=', 'user_profiles.department_id')
            ->selectRaw("COALESCE(departments.name, 'Unassigned') AS name, COUNT(*) AS count")
            ->groupBy('departments.name')
            ->orderByDesc('count')
            ->get()
            ->map(fn($r) => ['name' => $r->name, 'count' => (int) $r->count])
            ->all();
    }

    // ------------------------------------------------------------------
    // Insurance claims (derived from invoices; swap for a claims table if you add one)
    // ------------------------------------------------------------------
    private static function insuranceClaims(): array
    {
        return DB::table('invoices')
            ->whereNull('deleted_at')
            ->whereIn('payment_scheme', ['insurance', 'nhima'])
            ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(function ($inv) {
                $total = (float) $inv->total;
                $paid  = (float) ($inv->paid_amount ?? 0);

                $status = match (true) {
                    in_array($inv->status, ['rejected', 'cancelled', 'void'], true) => 'rejected',
                    $total > 0 && $paid >= $total                                    => 'accepted',
                    default                                                           => 'pending',
                };

                return [
                    'id'       => $inv->id,
                    'provider' => $inv->payment_scheme === 'nhima' ? 'NHIMA' : 'Insurance',
                    'patient'  => $inv->customer_name ?: 'Patient #' . $inv->patient_id,
                    'amount'   => $total,
                    'status'   => $status,
                    'date'     => self::iso($inv->created_at),
                ];
            })
            ->all();
    }

    // ------------------------------------------------------------------
    // New patient registrations (column names are guessed defensively)
    // ------------------------------------------------------------------
    private static function newRegistrations(): array
    {
        return DB::table('patients')
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(function ($p) {
                $p = (array) $p;

                $name = $p['name']
                    ?? trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? ''));

                $code = $p['patient_code'] ?? $p['patient_number'] ?? $p['mrn'] ?? ('PHA-' . str_pad((string) $p['id'], 4, '0', STR_PAD_LEFT));

                return [
                    'id'          => $p['id'],
                    'name'        => $name !== '' ? $name : 'Unnamed patient',
                    'patientCode' => $code,
                    'date'        => self::iso($p['created_at'] ?? null),
                    'status'      => in_array($p['status'] ?? 'active', ['inactive', 'suspended', 'deceased'], true)
                        ? 'inactive'
                        : 'active',
                ];
            })
            ->all();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------
    private static function iso($value): string
    {
        return ($value ? Carbon::parse($value) : now())->toIso8601String();
    }

    private static function safe(callable $callback, array $default = []): array
    {
        try {
            return $callback();
        } catch (\Throwable $e) {
            Log::error('Admin dashboard widget failed: ' . $e->getMessage(), [
                'file' => $e->getFile() . ':' . $e->getLine(),
            ]);

            return $default;
        }
    }
}
