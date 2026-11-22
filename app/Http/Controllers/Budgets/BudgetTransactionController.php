<?php

namespace App\Http\Controllers\Budgets;

use App\Http\Controllers\Controller;
use App\Models\Budgets\BudgetTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Models\Budgets\BudgetAllocation;

class BudgetTransactionController extends Controller
{
    /**
     * List transactions (paginated + filters).
     * GET /admin/budget-transactions
     */
    private const SORTABLE = [
        'transaction_no',
        'transaction_date',
        'amount',
        'transaction_type',
        'status',
        'created_at',
        'budget_code',
    ];

    /**
     * GET /admin/budget-transactions
     *
     * Response:
     *  transactions.expenseTx     -> ALL expense transactions (petty cash), not paginated
     *  transactions.transactions  -> paginated non-expense transactions (annual budget)
     *  total / last_page / current_page / per_page -> pagination of the non-expense list
     */
    public function index(Request $request): JsonResponse
    {
        // Non-expense (annual budget) transactions: filtered + paginated
        $annualQuery = $this->baseQuery($request)
            ->where('transaction_type', '<>', 'expense');

        if ($type = $request->input('type')) {
            $annualQuery->where('transaction_type', $type);
        }

        $pageSize  = min((int) $request->input('page_size', 10), 100);
        $paginator = $annualQuery->paginate($pageSize);

        $annualTransactions = $paginator->getCollection()
            ->map(fn(BudgetTransaction $tx) => $this->formatTransaction($tx))
            ->values();

        // Expense (petty cash) transactions: same common filters, all rows
        $expenseTransactions = $this->baseQuery($request)
            ->where('transaction_type', 'expense')
            ->get()
            ->map(fn(BudgetTransaction $tx) => $this->formatTransaction($tx))
            ->values();

        return response()->json([
            'success'      => true,
            'transactions' => [
                'expenseTx'    => $expenseTransactions,
                'transactions' => $annualTransactions,
            ],
            'total'        => $paginator->total(),
            'last_page'    => $paginator->lastPage(),
            'current_page' => $paginator->currentPage(),
            'per_page'     => $paginator->perPage(),
        ]);
    }

    /**
     * Shared query: relations, soft-delete guard, search, common filters, sorting.
     */
    private function baseQuery(Request $request): Builder
    {
        $query = BudgetTransaction::query()
            ->with([
                'creator:id,name',
                'approver:id,name',
                'allocation:id,budget_code,budget_name',
            ])
            ->whereNull('deleted_at');

        if ($search = $request->input('search')) {
            $query->where(function (Builder $q) use ($search) {
                $q->where('transaction_no', 'like', "%{$search}%")
                    ->orWhere('item_name', 'like', "%{$search}%")
                    ->orWhere('payee_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('budget_code', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($budgetCode = $request->input('budget_code')) {
            $query->where('budget_code', $budgetCode);
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('transaction_date', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('transaction_date', '<=', $to);
        }

        $sortBy = $request->input('sort_by', 'transaction_date');
        if (! in_array($sortBy, self::SORTABLE, true)) {
            $sortBy = 'transaction_date';
        }
        $sortDir = $request->input('sort_dir') === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sortBy, $sortDir);
    }

    /**
     * Single place that shapes a transaction for the frontend.
     */
    private function formatTransaction(BudgetTransaction $tx): array
    {
        return [
            'id'                    => $tx->id,
            'transaction_no'        => $tx->transaction_no,
            'transaction_code'      => $tx->transaction_code,
            'budget_code'           => $tx->budget_code,
            'budget_allocation_id'  => $tx->budget_allocation_id,
            'budget_name'           => $tx->allocation?->budget_name,
            'transaction_type'      => $tx->transaction_type,
            'reference_type'        => $tx->reference_type,
            'reference_id'          => $tx->reference_id,
            'amount'                => number_format((float) $tx->amount, 2, '.', ''),
            'balance_before'        => number_format((float) $tx->balance_before, 2, '.', ''),
            'balance_after'         => number_format((float) $tx->balance_after, 2, '.', ''),
            'description'           => $tx->description,
            'transaction_date'      => $tx->transaction_date?->format('Y-m-d'),
            'item_name'             => $tx->item_name,
            'quantity'              => $tx->quantity !== null
                ? number_format((float) $tx->quantity, 2, '.', '')
                : null,
            'unit_cost'             => $tx->unit_cost !== null
                ? number_format((float) $tx->unit_cost, 2, '.', '')
                : null,
            'payee_name'            => $tx->payee_name,
            'payment_method'        => $tx->payment_method,
            'reference_number'      => $tx->reference_number,
            'receipt_path'          => $tx->receipt_path,
            'receipt_original_name' => $tx->receipt_original_name,
            'status'                => $tx->status,
            'rejection_reason'      => $tx->rejection_reason,
            'created_by'            => $tx->created_by,
            'creator_name'          => $tx->creator?->name,
            'approved_by'           => $tx->approved_by,
            'approver_name'         => $tx->approver?->name,
            'approved_at'           => $tx->approved_at?->toIso8601String(),
            'created_at'            => $tx->created_at?->toIso8601String(),
            'updated_at'            => $tx->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Store a new transaction (with optional receipt).
     * POST /admin/budget-transactions
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'budget_allocation_id' => ['required', 'integer', 'exists:budget_allocations,id'],
            'budget_code'          => ['required', 'string', 'max:50'],
            'transaction_type'     => [
                'required',
                Rule::in([
                    'allocation',
                    'reallocation',
                    'reservation',
                    'commitment',
                    'actual',
                    'reversal',
                    'adjustment',
                    'transfer_in',
                    'transfer_out',
                    'expense',
                    'refund',
                ]),
            ],
            'transaction_date'  => ['required', 'date'],
            'amount'            => ['required', 'numeric', 'min:0.01'],
            'description'       => ['required', 'string', 'max:2000'],
            'item_name'         => ['nullable', 'string', 'max:255'],
            'quantity'          => ['nullable', 'numeric', 'min:0'],
            'unit_cost'         => ['nullable', 'numeric', 'min:0'],
            'payee_name'        => ['nullable', 'string', 'max:255'],
            'payment_method'    => [
                'nullable',
                Rule::in(['cash', 'mobile_money', 'bank_transfer', 'cheque']),
            ],
            'reference_number'  => ['nullable', 'string', 'max:100'],
            'reference_type'    => [
                'nullable',
                Rule::in(['PR', 'PO', 'GRN', 'invoice', 'adjustment', 'transfer']),
            ],
            'reference_id'      => ['nullable', 'integer'],
            'receipt'           => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'], // 5 MB
        ]);

        // Load & lock the allocation
        $allocation = BudgetAllocation::where('id', $validated['budget_allocation_id'])
            ->where('budget_code', $validated['budget_code'])
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->lockForUpdate()
            ->first();

        if (! $allocation) {
            return response()->json([
                'success' => false,
                'message' => 'Active budget allocation not found or mismatch.',
            ], 422);
        }

        $amount = round((float) $validated['amount'], 2);

        // For spend-type transactions, ensure sufficient available balance
        $spendTypes = ['expense', 'actual', 'reservation', 'commitment'];
        if (in_array($validated['transaction_type'], $spendTypes, true)) {
            if ((float) $allocation->available_amount < $amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient available budget. Available: ' .
                        number_format((float) $allocation->available_amount, 2) .
                        ' ZMW',
                ], 422);
            }
        }

        try {
            $transaction = DB::transaction(function () use ($request, $validated, $allocation, $amount) {
                $balanceBefore = (float) $allocation->available_amount;
                $balanceAfter  = $balanceBefore;

                // Adjust balances based on type
                switch ($validated['transaction_type']) {
                    case 'expense':
                    case 'actual':
                        $balanceAfter = $balanceBefore - $amount;
                        $allocation->available_amount = $balanceAfter;
                        $allocation->actual_spent     = (float) $allocation->actual_spent + $amount;
                        break;

                    case 'reservation':
                        $balanceAfter = $balanceBefore - $amount;
                        $allocation->available_amount = $balanceAfter;
                        $allocation->reserved_amount  = (float) $allocation->reserved_amount + $amount;
                        break;

                    case 'commitment':
                        // Usually reservation already reduced available; commitment just tracks
                        $allocation->committed_amount = (float) $allocation->committed_amount + $amount;
                        break;

                    case 'refund':
                    case 'reversal':
                        $balanceAfter = $balanceBefore + $amount;
                        $allocation->available_amount = $balanceAfter;
                        $allocation->actual_spent     = max(0, (float) $allocation->actual_spent - $amount);
                        break;

                    case 'adjustment':
                        // Positive amount increases available, negative decreases (handled by sign)
                        $balanceAfter = $balanceBefore + $amount; // amount can be negative if you allow it
                        $allocation->available_amount = $balanceAfter;
                        break;
                }

                // Recalculate utilization
                $allocated = (float) $allocation->allocated_amount;
                if ($allocated > 0) {
                    $spent = (float) $allocation->actual_spent;
                    $allocation->utilization_percentage = round(($spent / $allocated) * 100, 2);
                }

                $allocation->save();

                // Handle receipt upload
                $receiptPath         = null;
                $receiptOriginalName = null;
                $receiptMime         = null;
                $receiptSize         = null;

                if ($request->hasFile('receipt')) {
                    $file = $request->file('receipt');
                    $receiptOriginalName = $file->getClientOriginalName();
                    $receiptMime         = $file->getMimeType();
                    $receiptSize         = $file->getSize();

                    $filename = 'BT-' . now()->format('Ymd-His') . '-' . Str::random(8) . '.' . $file->getClientOriginalExtension();
                    $receiptPath = $file->storeAs('budget-receipts', $filename, 'public');
                }

                // Generate unique transaction number
                $transactionNo = $this->generateTransactionNo();

                $tx = BudgetTransaction::create([
                    'transaction_no'        => $transactionNo,
                    'transaction_code'      => null,
                    'budget_code'           => $allocation->budget_code,
                    'budget_allocation_id'  => $allocation->id,
                    'transaction_type'      => $validated['transaction_type'],
                    'reference_type'        => $validated['reference_type'] ?? null,
                    'reference_id'          => $validated['reference_id'] ?? null,
                    'amount'                => $amount,
                    'balance_before'        => $balanceBefore,
                    'balance_after'         => $balanceAfter,
                    'description'           => $validated['description'],
                    'transaction_date'      => $validated['transaction_date'],
                    'item_name'             => $validated['item_name'] ?? null,
                    'quantity'              => $validated['quantity'] ?? null,
                    'unit_cost'             => $validated['unit_cost'] ?? null,
                    'payee_name'            => $validated['payee_name'] ?? null,
                    'payment_method'        => $validated['payment_method'] ?? null,
                    'reference_number'      => $validated['reference_number'] ?? null,
                    'receipt_path'          => $receiptPath,
                    'receipt_original_name' => $receiptOriginalName,
                    'receipt_mime'          => $receiptMime,
                    'receipt_size'          => $receiptSize,
                    'status'                => 'pending', // or 'approved' if no approval workflow
                    'created_by'            => Auth::id(),
                    'recorded_by'           => Auth::id(),
                ]);

                return $tx;
            });

            return response()->json([
                'success'     => true,
                'message'     => 'Transaction recorded successfully.',
                'transaction' => [
                    'id'             => $transaction->id,
                    'transaction_no' => $transaction->transaction_no,
                    'status'         => $transaction->status,
                ],
            ], 201);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to record transaction: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show a single transaction.
     * GET /admin/budget-transactions/{id}
     */
    public function show(int $id)
    {
        $tx = BudgetTransaction::with([
            'creator:id,name',
            'approver:id,name',
            'allocation:id,budget_code,budget_name,available_amount',
        ])->findOrFail($id);

        return response()->json([
            'success'     => true,
            'transaction' => $tx,
        ]);
    }

    /**
     * Approve a pending transaction.
     * POST /admin/budget-transactions/{id}/approve
     */
    public function approve(int $id)
    {
        $tx = BudgetTransaction::where('status', 'pending')->findOrFail($id);

        $tx->update([
            'status'      => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Transaction {$tx->transaction_no} approved.",
        ]);
    }

    /**
     * Reject a pending transaction.
     * POST /admin/budget-transactions/{id}/reject
     */
    public function reject(Request $request, int $id)
    {
        $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $tx = BudgetTransaction::where('status', 'pending')->findOrFail($id);

        // Optionally reverse the balance impact here if you only apply on approval
        // (current design applies on create – adjust if you prefer approve-then-post)

        $tx->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'approved_by'      => Auth::id(),
            'approved_at'      => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Transaction {$tx->transaction_no} rejected.",
        ]);
    }

    /**
     * Soft-delete / void a transaction.
     * DELETE /admin/budget-transactions/{id}
     */
    public function destroy(int $id)
    {
        $tx = BudgetTransaction::findOrFail($id);

        if ($tx->status === 'void') {
            return response()->json([
                'success' => false,
                'message' => 'Transaction is already void.',
            ], 422);
        }

        // Optional: reverse balance impact before voiding
        // (implement carefully based on your business rules)

        $tx->update(['status' => 'void']);
        $tx->delete(); // soft delete

        return response()->json([
            'success' => true,
            'message' => "Transaction {$tx->transaction_no} voided.",
        ]);
    }

    /**
     * Generate unique transaction number: BT-YYYYMM-XXXXX
     */
    protected function generateTransactionNo(): string
    {
        $prefix = 'BT-' . now()->format('Ym') . '-';

        $last = BudgetTransaction::withTrashed()
            ->where('transaction_no', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('transaction_no');

        $seq = 1;
        if ($last) {
            $parts = explode('-', $last);
            $seq   = ((int) end($parts)) + 1;
        }

        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
