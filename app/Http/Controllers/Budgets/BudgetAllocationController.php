<?php

namespace App\Http\Controllers\Budgets;

use App\Http\Controllers\Controller;
use App\Models\Budgets\BudgetAllocation;
use App\Models\Budgets\BudgetCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BudgetAllocationController extends Controller
{
    /**
     * List budgets (used by frontend /admin/all-budgets)
     * GET /api/v1/admin/all-budgets
     */
    public function index(Request $request)
    {
        $query = BudgetAllocation::query()
            ->with([
                'category:id,code,name,color',
                'department:id,name',
                'creator:id,name',
                'approver:id,name',
            ])
            ->whereNull('deleted_at');

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('budget_code', 'like', "%{$search}%")
                    ->orWhere('budget_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($type = $request->input('type')) {
            $query->where('budget_type', $type);
        }

        if ($category = $request->input('category')) {
            $query->where('category_id', $category);
        }

        if ($year = $request->input('year')) {
            $query->where('fiscal_year', $year);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($budgetCategory = $request->input('budget_category')) {
            $query->where('budget_category', $budgetCategory); // petty_budget | planned_budget
        }

        // Sorting
        $sortBy  = $request->input('sort_by', 'budget_code');
        $sortDir = $request->input('sort_dir', 'asc');
        $allowed = [
            'budget_code',
            'budget_name',
            'allocated_amount',
            'actual_spent',
            'available_amount',
            'utilization_percentage',
            'status',
            'fiscal_year',
            'created_at'
        ];
        if (!in_array($sortBy, $allowed)) {
            $sortBy = 'budget_code';
        }
        $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');

        $pageSize  = min((int) $request->input('page_size', 10), 100);
        $paginator = $query->paginate($pageSize);

        $budgets = $paginator->getCollection()->map(function (BudgetAllocation $b) {
            return $this->formatBudget($b);
        });

        // Filter options for the frontend
        $filters = [
            'categories' => BudgetCategory::where('is_active', 1)
                ->orderBy('name')
                ->get(['id', 'code', 'name'])
                ->map(fn($c) => [
                    'value' => (string) $c->id,
                    'label' => "{$c->code} — {$c->name}",
                ]),
            'years' => BudgetAllocation::select('fiscal_year')
                ->distinct()
                ->orderByDesc('fiscal_year')
                ->pluck('fiscal_year')
                ->map(fn($y) => ['value' => (string) $y, 'label' => (string) $y]),
            'departments' => \App\Models\Department::orderBy('name')
                ->get(['id', 'name'])
                ->map(fn($d) => ['value' => (string) $d->id, 'label' => $d->name]),
        ];

        return response()->json([
            'success'  => true,
            'budgets'  => $budgets,
            'total'    => $paginator->total(),
            'last_page' => $paginator->lastPage(),
            'filters'  => $filters,
        ]);
    }

    /**
     * Create a new budget allocation
     * POST /api/v1/admin/budgets
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'budget_name'       => ['required', 'string', 'max:255'],
            'description'       => ['nullable', 'string'],
            'category_id'       => ['nullable', 'integer', 'exists:budget_categories,id'],
            'department_id'     => ['nullable', 'integer', 'exists:departments,id'],
            'supplier_id'       => ['nullable', 'integer', 'exists:suppliers,id'],
            'fiscal_year'       => ['required', 'integer', 'min:2020', 'max:2100'],
            'budget_type'       => ['required', Rule::in(['annual', 'quarterly', 'monthly', 'project'])],
            'budget_category'   => ['nullable', Rule::in(['petty_budget', 'planned_budget'])],
            'original_amount'   => ['required', 'numeric', 'min:0.01'],
            'allocated_amount'  => ['nullable', 'numeric', 'min:0'],
            'warning_threshold' => ['nullable', 'numeric', 'min:1', 'max:100'],
            'critical_threshold' => ['nullable', 'numeric', 'min:1', 'max:100'],
            'status'            => ['nullable', Rule::in(['draft', 'active'])],
        ]);

        try {
            $budget = DB::transaction(function () use ($validated) {
                $amount = round((float) $validated['original_amount'], 2);
                $allocated = isset($validated['allocated_amount'])
                    ? round((float) $validated['allocated_amount'], 2)
                    : $amount;

                $budgetCode = $this->generateBudgetCode((int) $validated['fiscal_year']);

                return BudgetAllocation::create([
                    'budget_category'        => $validated['budget_category'] ?? 'planned_budget',
                    'is_locked'              => false,
                    'budget_code'            => $budgetCode,
                    'budget_name'            => $validated['budget_name'],
                    'description'            => $validated['description'] ?? null,
                    'category_id'            => $validated['category_id'] ?? null,
                    'department_id'          => $validated['department_id'] ?? null,
                    'supplier_id'            => $validated['supplier_id'] ?? null,
                    'fiscal_year'            => $validated['fiscal_year'],
                    'budget_type'            => $validated['budget_type'],
                    'original_amount'        => $amount,
                    'revised_amount'         => null,
                    'allocated_amount'       => $allocated,
                    'reserved_amount'        => 0,
                    'committed_amount'       => 0,
                    'actual_spent'           => 0,
                    'available_amount'       => $allocated,
                    'utilization_percentage' => 0,
                    'warning_threshold'      => $validated['warning_threshold'] ?? 75.00,
                    'critical_threshold'     => $validated['critical_threshold'] ?? 90.00,
                    'alert_triggered'        => false,
                    'status'                 => $validated['status'] ?? 'draft',
                    'created_by'             => Auth::id(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => "Budget {$budget->budget_code} created successfully.",
                'budget'  => $this->formatBudget($budget->load('category')),
            ], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create budget: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show single budget
     * GET /api/v1/admin/budgets/{id}
     */
    public function show(int $id)
    {
        $budget = BudgetAllocation::with([
            'category',
            'department',
            'supplier',
            'creator',
            'approver',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'budget'  => $this->formatBudget($budget),
        ]);
    }

    /**
     * Archive a budget
     * POST /api/v1/admin/budgets/{id}/archive
     */
    public function archive(int $id)
    {
        $budget = BudgetAllocation::findOrFail($id);

        if ((float) $budget->actual_spent > 0 || (float) $budget->committed_amount > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot archive: this budget has spend or commitments. Close it instead.',
            ], 422);
        }

        $budget->update(['status' => 'archived']);
        $budget->delete(); // soft delete

        return response()->json([
            'success' => true,
            'message' => "Budget {$budget->budget_code} archived.",
        ]);
    }

    /**
     * Generate unique budget code: BUD-YYYY-XXXXX
     */
    protected function generateBudgetCode(int $year): string
    {
        $prefix = "BUD-{$year}-";

        $last = BudgetAllocation::withTrashed()
            ->where('budget_code', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('budget_code');

        $seq = 1;
        if ($last) {
            $parts = explode('-', $last);
            $seq   = ((int) end($parts)) + 1;
        }

        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Format budget for API response (matches frontend Budget interface)
     */
    protected function formatBudget(BudgetAllocation $b): array
    {
        return [
            'id'                     => $b->id,
            'budget_code'            => $b->budget_code,
            'budget_name'            => $b->budget_name,
            'description'            => $b->description,
            'category_id'            => $b->category_id,
            'category'               => $b->category ? [
                'id'    => $b->category->id,
                'code'  => $b->category->code,
                'name'  => $b->category->name,
                'color' => $b->category->color ?? null,
            ] : null,
            'department_id'          => $b->department_id,
            'department_name'        => $b->department?->name,
            'supplier_id'            => $b->supplier_id,
            'supplier_name'          => $b->supplier?->name,
            'fiscal_year'            => (string) $b->fiscal_year,
            'budget_type'            => $b->budget_type,
            'budget_category'        => $b->budget_category,
            'original_amount'        => number_format((float) $b->original_amount, 2, '.', ''),
            'revised_amount'         => $b->revised_amount !== null
                ? number_format((float) $b->revised_amount, 2, '.', '')
                : null,
            'allocated_amount'       => number_format((float) $b->allocated_amount, 2, '.', ''),
            'reserved_amount'        => number_format((float) $b->reserved_amount, 2, '.', ''),
            'committed_amount'       => number_format((float) $b->committed_amount, 2, '.', ''),
            'actual_spent'           => number_format((float) $b->actual_spent, 2, '.', ''),
            'available_amount'       => number_format((float) $b->available_amount, 2, '.', ''),
            'utilization_percentage' => number_format((float) $b->utilization_percentage, 2, '.', ''),
            'warning_threshold'      => number_format((float) $b->warning_threshold, 2, '.', ''),
            'critical_threshold'     => number_format((float) $b->critical_threshold, 2, '.', ''),
            'alert_triggered'        => (bool) $b->alert_triggered,
            'alert_message'          => $b->alert_message,
            'alert_triggered_at'     => $b->alert_triggered_at?->toIso8601String(),
            'status'                 => $b->status,
            'created_by'             => $b->created_by,
            'approved_by'            => $b->approved_by,
            'approver_name'          => $b->approver?->name,
            'approved_at'            => $b->approved_at?->toIso8601String(),
            'created_at'             => $b->created_at?->toIso8601String(),
            'updated_at'             => $b->updated_at?->toIso8601String(),
            'deleted_at'             => $b->deleted_at?->toIso8601String(),
        ];
    }
}
