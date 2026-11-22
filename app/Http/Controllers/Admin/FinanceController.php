<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Finance\FinanceCategory;
use App\Models\Finance\FinanceExpense;
use App\Models\Finance\FinanceRevenue;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    private const PAYMENTS_TABLE = 'payments';

    /**
     * GET /admin/finance
     */
    public function index(Request $request): Response
    {
        $categories = FinanceCategory::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        return Inertia::render('admin/finance/Finance', [
            'filters' => [
                'revenue_categories' => $categories
                    ->where('type', 'revenue')
                    ->map(fn($c) => [
                        'value' => (string) $c->id,
                        'label' => $c->name,
                    ])->values(),

                'expense_categories' => $categories
                    ->where('type', 'expense')
                    ->map(fn($c) => [
                        'value' => (string) $c->id,
                        'label' => $c->name,
                    ])->values(),
            ],

            'permissions' => $this->permissions($request),
        ]);
    }

    /**
     * Completed patient collections.
     *
     * Actual payments schema:
     * paid_amount, payment_date, payment_method,
     * payment_number, transaction_reference,
     * receipt_number, invoice_id, patient_id.
     */
    private function paymentsQuery()
    {
        return DB::table(self::PAYMENTS_TABLE)
            ->where('status', 'completed');
    }

    /**
     * GET /admin/finance/overview
     */
    public function overview(Request $request): JsonResponse
    {
        [$from, $to] = $this->dateRange($request);

        // Patient collections
        $payments = fn() => $this->paymentsQuery()
            ->whereDate('payment_date', '>=', $from)
            ->whereDate('payment_date', '<=', $to);

        $collectionsTotal = (float) $payments()->sum('paid_amount');

        $collectionsCount = (int) $payments()->count();

        $collectionsByMethod = $payments()
            ->selectRaw("
                payment_method AS method,
                SUM(paid_amount) AS total,
                COUNT(*) AS count
            ")
            ->groupBy('payment_method')
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => [
                'method' => $r->method,
                'total' => round((float) $r->total, 2),
                'count' => (int) $r->count,
            ]);

        // Other revenue: grants, donations, insurance claims, etc.
        $revenueBase = fn() => FinanceRevenue::query()
            ->where('status', 'received')
            ->whereDate('revenue_date', '>=', $from)
            ->whereDate('revenue_date', '<=', $to);

        $revenueTotal = (float) $revenueBase()->sum('amount');

        $revenueByCategory = $revenueBase()
            ->join(
                'finance_categories as c',
                'c.id',
                '=',
                'finance_revenues.category_id'
            )
            ->selectRaw('
                c.name AS category,
                SUM(finance_revenues.amount) AS total
            ')
            ->groupBy('c.name')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn($r) => [
                'category' => $r->category,
                'total' => round((float) $r->total, 2),
            ]);

        // Expenses
        $expenseBase = fn() => FinanceExpense::query()
            ->whereDate('expense_date', '>=', $from)
            ->whereDate('expense_date', '<=', $to);

        $expensesTotal = (float) $expenseBase()
            ->whereIn('status', FinanceExpense::SPENT_STATUSES)
            ->sum('amount');

        $pendingExpenses = (float) $expenseBase()
            ->where('status', 'pending')
            ->sum('amount');

        $pendingCount = (int) $expenseBase()
            ->where('status', 'pending')
            ->count();

        $expensesByCategory = $expenseBase()
            ->whereIn(
                'finance_expenses.status',
                FinanceExpense::SPENT_STATUSES
            )
            ->join(
                'finance_categories as c',
                'c.id',
                '=',
                'finance_expenses.category_id'
            )
            ->selectRaw('
                c.name AS category,
                SUM(finance_expenses.amount) AS total
            ')
            ->groupBy('c.name')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn($r) => [
                'category' => $r->category,
                'total' => round((float) $r->total, 2),
            ]);

        $totalIncome = $collectionsTotal + $revenueTotal;

        return response()->json([
            'success' => true,

            'range' => [
                'from' => $from,
                'to' => $to,
            ],

            'overview' => [
                'collections_total' => round($collectionsTotal, 2),
                'collections_count' => $collectionsCount,

                'revenue_total' => round($revenueTotal, 2),

                'total_income' => round($totalIncome, 2),

                'expenses_total' => round($expensesTotal, 2),

                'pending_expenses' => round($pendingExpenses, 2),
                'pending_expense_count' => $pendingCount,

                'net_position' => round(
                    $totalIncome - $expensesTotal,
                    2
                ),

                'collections_by_method' => $collectionsByMethod,
                'revenue_by_category' => $revenueByCategory,
                'expenses_by_category' => $expensesByCategory,

                'trend' => $this->monthlyTrend($to),
            ],
        ]);
    }

    /**
     * GET /admin/finance/collections
     *
     * Read-only patient payment records.
     */
    public function collections(Request $request): JsonResponse
    {
        $query = $this->paymentsQuery();

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_id', 'like', "%{$search}%")
                    ->orWhere('payment_number', 'like', "%{$search}%")
                    ->orWhere('receipt_number', 'like', "%{$search}%")
                    ->orWhere('transaction_reference', 'like', "%{$search}%")
                    ->orWhere('payment_method', 'like', "%{$search}%");
            });
        }

        // Payment method
        if ($method = $request->input('payment_method')) {
            $query->where('payment_method', $method);
        }

        // Date filters use payment_date, NOT created_at.
        if ($from = $request->input('date_from')) {
            $query->whereDate('payment_date', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('payment_date', '<=', $to);
        }

        // Calculate total before pagination.
        $totalAmount = (float) (clone $query)->sum('paid_amount');

        $pageSize = min(
            max((int) $request->input('page_size', 10), 1),
            100
        );

        $paginator = $query
            ->orderByDesc('payment_date')
            ->paginate($pageSize);

        $collections = $paginator->getCollection()
            ->map(fn($p) => [
                'id' => $p->id,

                'patient_id' => $p->patient_id,
                'invoice_id' => $p->invoice_id,

                'payment_number' => $p->payment_number,

                'amount' => number_format(
                    (float) $p->paid_amount,
                    2,
                    '.',
                    ''
                ),

                'total_amount' => number_format(
                    (float) $p->total_amount,
                    2,
                    '.',
                    ''
                ),

                'payment_method' => $p->payment_method,

                'reference' => $p->transaction_reference,

                'transaction_reference' => $p->transaction_reference,

                'receipt_number' => $p->receipt_number,

                'status' => $p->status,

                'payment_confirmed' => (bool) $p->payment_confirmed,

                'collected_at' => $p->payment_date
                    ? Carbon::parse($p->payment_date)->toIso8601String()
                    : null,
            ])
            ->values();

        // Available payment methods
        $methods = DB::table(self::PAYMENTS_TABLE)
            ->where('status', 'completed')
            ->whereNotNull('payment_method')
            ->distinct()
            ->orderBy('payment_method')
            ->pluck('payment_method')
            ->map(fn($m) => [
                'value' => $m,
                'label' => ucwords(str_replace('_', ' ', $m)),
            ])
            ->values();

        return response()->json([
            'success' => true,

            'collections' => $collections,

            'summary' => [
                'total_amount' => round($totalAmount, 2),
            ],

            'methods' => $methods,

            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
        ]);
    }

    /**
     * Six-month financial trend.
     */
    private function monthlyTrend(string $to): array
    {
        $end = Carbon::parse($to)->endOfMonth();

        $months = collect(range(5, 0))
            ->map(fn($i) => $end->copy()
                ->startOfMonth()
                ->subMonths($i));

        $start = $months->first()->toDateString();
        $stop = $end->toDateString();

        // Patient collections
        $collections = $this->paymentsQuery()
            ->whereDate('payment_date', '>=', $start)
            ->whereDate('payment_date', '<=', $stop)
            ->selectRaw("
                DATE_FORMAT(payment_date, '%Y-%m') AS m,
                SUM(paid_amount) AS total
            ")
            ->groupBy('m')
            ->pluck('total', 'm');

        // Other revenue
        $revenues = FinanceRevenue::query()
            ->where('status', 'received')
            ->whereDate('revenue_date', '>=', $start)
            ->whereDate('revenue_date', '<=', $stop)
            ->selectRaw("
                DATE_FORMAT(revenue_date, '%Y-%m') AS m,
                SUM(amount) AS total
            ")
            ->groupBy('m')
            ->pluck('total', 'm');

        // Expenses
        $expenses = FinanceExpense::query()
            ->whereIn('status', FinanceExpense::SPENT_STATUSES)
            ->whereDate('expense_date', '>=', $start)
            ->whereDate('expense_date', '<=', $stop)
            ->selectRaw("
                DATE_FORMAT(expense_date, '%Y-%m') AS m,
                SUM(amount) AS total
            ")
            ->groupBy('m')
            ->pluck('total', 'm');

        return $months->map(function (Carbon $month) use (
            $collections,
            $revenues,
            $expenses
        ) {
            $key = $month->format('Y-m');

            $col = (float) ($collections[$key] ?? 0);
            $rev = (float) ($revenues[$key] ?? 0);
            $exp = (float) ($expenses[$key] ?? 0);

            return [
                'month' => $month->format('M Y'),
                'collections' => round($col, 2),
                'revenue' => round($rev, 2),
                'income' => round($col + $rev, 2),
                'expenses' => round($exp, 2),
            ];
        })->values()->all();
    }

    /**
     * Date range defaults to year-to-date.
     */
    private function dateRange(Request $request): array
    {
        $from = $request->input('date_from')
            ?: now()->startOfYear()->toDateString();

        $to = $request->input('date_to')
            ?: now()->toDateString();

        return [$from, $to];
    }

    /**
     * TODO: Connect to your actual role/permission system.
     */
    private function permissions(Request $request): array
    {
        return [
            'can_create' => true,
            'can_approve' => true,
            'can_pay' => true,
            'can_cancel' => true,
        ];
    }
}
