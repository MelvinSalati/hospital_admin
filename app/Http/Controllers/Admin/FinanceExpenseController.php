<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Finance\FinanceExpense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Spending / expenses with a simple workflow:
 *   pending -> approved -> paid        (reject: pending -> rejected)
 *   void: pending / approved / paid -> void
 */
class FinanceExpenseController extends Controller
{
    public const PAYMENT_METHODS = ['cash', 'mobile_money', 'bank_transfer', 'cheque', 'card'];

    /**
     * GET /admin/finance/expenses
     * Params: search, status, category_id, budget_code, date_from, date_to, page, page_size
     */
    public function index(Request $request): JsonResponse
    {
        $query = FinanceExpense::query()
            ->with(['category:id,name', 'creator:id,name', 'approver:id,name', 'payer:id,name']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('expense_no', 'like', "%{$search}%")
                    ->orWhere('payee_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%")
                    ->orWhere('budget_code', 'like', "%{$search}%");
            });
        }

        foreach (['status', 'category_id', 'budget_code'] as $field) {
            if ($value = $request->input($field)) {
                $query->where($field, $value);
            }
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('expense_date', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('expense_date', '<=', $to);
        }

        // Aggregate BEFORE ordering/paginating
        $spent   = (float) (clone $query)->whereIn('status', FinanceExpense::SPENT_STATUSES)->sum('amount');
        $pending = (float) (clone $query)->where('status', 'pending')->sum('amount');

        $pageSize  = min((int) $request->input('page_size', 10), 100);
        $paginator = $query->orderByDesc('expense_date')->orderByDesc('id')->paginate($pageSize);

        return response()->json([
            'success'      => true,
            'expenses'     => $paginator->getCollection()->map(fn(FinanceExpense $e) => $e->toFrontend())->values(),
            'summary'      => [
                'spent_total'   => round($spent, 2),
                'pending_total' => round($pending, 2),
            ],
            'total'        => $paginator->total(),
            'last_page'    => $paginator->lastPage(),
            'current_page' => $paginator->currentPage(),
            'per_page'     => $paginator->perPage(),
        ]);
    }

    /** POST /admin/finance/expenses  (multipart/form-data) */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'expense_date'     => ['required', 'date'],
            'category_id'      => ['required', Rule::exists('finance_categories', 'id')->where('type', 'expense')],
            'budget_code'      => ['nullable', 'string', 'max:50', Rule::exists('budget_allocations', 'budget_code')],
            'payee_name'       => ['required', 'string', 'max:255'],
            'amount'           => ['required', 'numeric', 'min:0.01', 'max:999999999999.99'],
            'payment_method'   => ['nullable', Rule::in(self::PAYMENT_METHODS)],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'description'      => ['nullable', 'string', 'max:2000'],
            'receipt'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        if ($request->hasFile('receipt')) {
            $file = $request->file('receipt');
            $data['receipt_path'] = $file->store('finance-receipts', 'public');
            $data['receipt_original_name'] = $file->getClientOriginalName();
        }
        unset($data['receipt']);

        $data['status']     = 'pending';
        $data['created_by'] = $request->user()?->id;

        $expense = FinanceExpense::create($data);

        return $this->ok($expense, "Expense {$expense->expense_no} submitted for approval", 201);
    }

    /** POST /admin/finance/expenses/{expense}/approve */
    public function approve(Request $request, FinanceExpense $expense): JsonResponse
    {
        if ($expense->status !== 'pending') {
            return $this->fail('Only pending expenses can be approved');
        }

        $expense->update([
            'status'      => 'approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        return $this->ok($expense, "Expense {$expense->expense_no} approved");
    }

    /** POST /admin/finance/expenses/{expense}/reject  { reason } */
    public function reject(Request $request, FinanceExpense $expense): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        if ($expense->status !== 'pending') {
            return $this->fail('Only pending expenses can be rejected');
        }

        $expense->update([
            'status'           => 'rejected',
            'rejection_reason' => $data['reason'],
            'approved_by'      => $request->user()?->id,
            'approved_at'      => now(),
        ]);

        return $this->ok($expense, "Expense {$expense->expense_no} rejected");
    }

    /** POST /admin/finance/expenses/{expense}/pay  (approved -> paid) */
    public function markPaid(Request $request, FinanceExpense $expense): JsonResponse
    {
        if ($expense->status !== 'approved') {
            return $this->fail('Only approved expenses can be marked as paid');
        }

        $expense->update([
            'status'  => 'paid',
            'paid_by' => $request->user()?->id,
            'paid_at' => now(),
        ]);

        return $this->ok($expense, "Expense {$expense->expense_no} marked as paid");
    }

    /** POST /admin/finance/expenses/{expense}/void  { reason } */
    public function void(Request $request, FinanceExpense $expense): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        if (in_array($expense->status, ['void', 'rejected'], true)) {
            return $this->fail('This expense is already void or rejected');
        }

        $expense->update([
            'status'           => 'void',
            'rejection_reason' => $data['reason'],
        ]);

        return $this->ok($expense, "Expense {$expense->expense_no} voided");
    }

    private function ok(FinanceExpense $expense, string $message, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'expense' => $expense->fresh(['category:id,name', 'creator:id,name', 'approver:id,name', 'payer:id,name'])->toFrontend(),
        ], $status);
    }

    private function fail(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], 422);
    }
}
