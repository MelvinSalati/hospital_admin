<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Finance\FinanceRevenue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Non-patient revenue: grants, donations, insurance claim payments, other income. */
class FinanceRevenueController extends Controller
{
    public const SOURCE_TYPES    = ['grant', 'donation', 'insurance_claim', 'service_fee', 'other'];
    public const PAYMENT_METHODS = ['cash', 'mobile_money', 'bank_transfer', 'cheque', 'card'];

    /**
     * GET /admin/finance/revenues
     * Params: search, status, category_id, source_type, date_from, date_to, page, page_size
     */
    public function index(Request $request): JsonResponse
    {
        $query = FinanceRevenue::query()->with(['category:id,name', 'creator:id,name', 'canceller:id,name']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('revenue_no', 'like', "%{$search}%")
                    ->orWhere('payer_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%");
            });
        }

        foreach (['status', 'category_id', 'source_type'] as $field) {
            if ($value = $request->input($field)) {
                $query->where($field, $value);
            }
        }

        if ($from = $request->input('date_from')) {
            $query->whereDate('revenue_date', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->whereDate('revenue_date', '<=', $to);
        }

        // Aggregate BEFORE ordering/paginating
        $received = (float) (clone $query)->where('status', 'received')->sum('amount');
        $pending  = (float) (clone $query)->where('status', 'pending')->sum('amount');

        $pageSize  = min((int) $request->input('page_size', 10), 100);
        $paginator = $query->orderByDesc('revenue_date')->orderByDesc('id')->paginate($pageSize);

        return response()->json([
            'success'      => true,
            'revenues'     => $paginator->getCollection()->map(fn(FinanceRevenue $r) => $r->toFrontend())->values(),
            'summary'      => [
                'received_total' => round($received, 2),
                'pending_total'  => round($pending, 2),
            ],
            'total'        => $paginator->total(),
            'last_page'    => $paginator->lastPage(),
            'current_page' => $paginator->currentPage(),
            'per_page'     => $paginator->perPage(),
        ]);
    }

    /** POST /admin/finance/revenues  (multipart/form-data) */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'revenue_date'     => ['required', 'date'],
            'category_id'      => ['required'],
            'source_type'      => ['required', Rule::in(self::SOURCE_TYPES)],
            'payer_name'       => ['nullable', 'string', 'max:255'],
            'amount'           => ['required', 'numeric', 'min:0.01', 'max:999999999999.99'],
            'payment_method'   => ['nullable', Rule::in(self::PAYMENT_METHODS)],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'description'      => ['nullable', 'string', 'max:2000'],
            'status'           => ['nullable', Rule::in(['pending', 'received'])],
            'receipt'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        if ($request->hasFile('receipt')) {
            $file = $request->file('receipt');
            $data['receipt_path'] = $file->store('finance-receipts', 'public');
            $data['receipt_original_name'] = $file->getClientOriginalName();
        }
        unset($data['receipt']);

        $data['status']     = $data['status'] ?? 'received';
        $data['created_by'] = $request->user()?->id;

        $revenue = FinanceRevenue::create($data)->load(['category:id,name', 'creator:id,name']);

        return response()->json([
            'success' => true,
            'message' => "Revenue {$revenue->revenue_no} recorded",
            'revenue' => $revenue->toFrontend(),
        ], 201);
    }

    /** POST /admin/finance/revenues/{revenue}/receive  (pending -> received) */
    public function markReceived(Request $request, FinanceRevenue $revenue): JsonResponse
    {
        if ($revenue->status !== 'pending') {
            return $this->fail('Only pending revenue can be marked as received');
        }

        $revenue->update(['status' => 'received']);

        return $this->ok($revenue, "Revenue {$revenue->revenue_no} marked as received");
    }

    /** POST /admin/finance/revenues/{revenue}/cancel  { reason } */
    public function cancel(Request $request, FinanceRevenue $revenue): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        if ($revenue->status === 'cancelled') {
            return $this->fail('This revenue entry is already cancelled');
        }

        $revenue->update([
            'status'              => 'cancelled',
            'cancelled_by'        => $request->user()?->id,
            'cancelled_at'        => now(),
            'cancellation_reason' => $data['reason'],
        ]);

        return $this->ok($revenue, "Revenue {$revenue->revenue_no} cancelled");
    }

    private function ok(FinanceRevenue $revenue, string $message): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'revenue' => $revenue->fresh(['category:id,name', 'creator:id,name', 'canceller:id,name'])->toFrontend(),
        ]);
    }

    private function fail(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], 422);
    }
}
