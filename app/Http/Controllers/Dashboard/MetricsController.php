<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\VisitToken;
use App\Models\Patients\Payment;
use App\Models\Patients\Patient;
use App\Models\Patients\Invoice;
use Carbon\Carbon;

class MetricsController extends Controller
{
    public function dashboard(Request $request): Response
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        // ── Statistics ──────────────────────────────────────────
        $totalPatients    = Patient::count();
        $todayVisits      = VisitToken::whereDate('created_at', $today)->count();
        $yesterdayVisits  = VisitToken::whereDate('created_at', $yesterday)->count();

        $revenueToday     = Payment::where('status', 'completed')
            ->whereDate('created_at', $today)
            ->sum('total_amount');
        $revenueYesterday = Payment::where('status', 'completed')
            ->whereDate('created_at', $yesterday)
            ->sum('total_amount');

        $pendingBills     = Invoice::whereIn('status', ['draft', 'sent', 'partial', 'overdue'])
            ->count();

        // Calculate trends
        $visitTrendPct = $yesterdayVisits > 0
            ? round((($todayVisits - $yesterdayVisits) / $yesterdayVisits) * 100, 1)
            : 0;

        $revenueTrendPct = $revenueYesterday > 0
            ? round((($revenueToday - $revenueYesterday) / $revenueYesterday) * 100, 1)
            : 0;

        // ── Payment methods (current month) ─────────────────────
        $paymentMethods = Payment::where('status', 'completed')
            ->selectRaw('payment_method as method, SUM(total_amount) as amount')
            ->whereMonth('created_at', $today->month)
            ->whereYear('created_at', $today->year)
            ->whereNotNull('payment_method')
            ->groupBy('payment_method')
            ->get()
            ->map(fn($row) => [
                'method' => $row->method,
                'amount' => (float) $row->amount,
            ]);

        if ($paymentMethods->isEmpty()) {
            $paymentMethods = collect([
                ['method' => 'Cash', 'amount' => 0],
                ['method' => 'Card', 'amount' => 0],
                ['method' => 'Insurance', 'amount' => 0],
                ['method' => 'Mobile Money', 'amount' => 0],
            ]);
        }

        // ── Age distribution ────────────────────────────────────
        $ageDistribution = Patient::selectRaw("
            CASE
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 0  AND 17 THEN 'Children'
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 18 AND 35 THEN 'Young Adults'
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 36 AND 59 THEN 'Adults'
                WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= 60 THEN 'Elderly'
                ELSE 'Unknown'
            END as label,
            COUNT(*) as count
        ")
            ->whereNotNull('date_of_birth')
            ->groupByRaw('label')
            ->orderByRaw("FIELD(label, 'Children', 'Young Adults', 'Adults', 'Elderly', 'Unknown')")
            ->get();

        // ── Paginated invoices ──────────────────────────────────
        $invoices = Invoice::with('patient:id,first_name,last_name')
            ->select([
                'id',
                'invoice_number',
                'patient_id',
                'issue_date',
                'total',
                'paid_amount',
                'status',
                'due_amount',
                'currency',
                'items',
                'customer_name',
            ])
            ->selectRaw('(total - COALESCE(paid_amount, 0)) as balance')
            ->latest('issue_date')
            ->paginate(5)
            ->through(function ($inv) {
                $patientName = '—';

                if ($inv->relationLoaded('patient') && $inv->patient) {
                    $firstName = $inv->patient->first_name ?? '';
                    $lastName = $inv->patient->last_name ?? '';
                    $patientName = trim($firstName . ' ' . $lastName);

                    if (empty($patientName)) {
                        $patientName = 'Patient #' . $inv->patient_id;
                    }
                } elseif (!empty($inv->customer_name)) {
                    $patientName = $inv->customer_name;
                }

                return [
                    'id'            => $inv->id,
                    'invoiceNumber' => $inv->invoice_number,
                    'patientId'     => $inv->patient_id,
                    'patientName'   => $patientName,
                    'billDate'      => $inv->issue_date ? Carbon::parse($inv->issue_date)->format('d M Y') : '—',
                    'totalAmount'   => (float) $inv->total,
                    'amountPaid'    => (float) ($inv->paid_amount ?? 0),
                    'balance'       => (float) ($inv->balance ?? $inv->due_amount ?? 0),
                    'status'        => $this->mapInvoiceStatus($inv->status),
                    'currency'      => $inv->currency ?? 'ZMW',
                    'items'         => $this->parseInvoiceItems($inv->items),
                ];
            });

        return Inertia::render('dashboard', [
            'statistics' => [
                'totalPatients'       => $totalPatients,
                'todayVisits'         => $todayVisits,
                'revenueToday'        => (float) $revenueToday,
                'pendingBills'        => $pendingBills,
                'totalPatientsTrend'  => 0,
                'todayVisitsTrend'    => $visitTrendPct,
                'revenueTodayTrend'   => $revenueTrendPct,
                'pendingBillsTrend'   => 0,
            ],
            'paymentMethods'  => $paymentMethods,
            'ageDistribution' => $ageDistribution,
            'invoices'        => $invoices,
        ]);
    }

  

    private function mapInvoiceStatus(?string $status): string
    {
        return match ($status) {
            'paid' => 'paid',
            'partial' => 'partial',
            'sent', 'draft' => 'unpaid',
            'overdue' => 'overdue',
            default => 'pending',
        };
    }

    private function parseInvoiceItems($items): array
    {
        if (empty($items)) {
            return [];
        }

        $decodedItems = is_string($items) ? json_decode($items, true) : $items;

        if (!is_array($decodedItems)) {
            return [];
        }

        return collect($decodedItems)->map(fn($item) => [
            'description' => $item['description'] ?? $item['name'] ?? $item['item_name'] ?? 'N/A',
            'quantity'    => (float) ($item['quantity'] ?? 1),
            'unitPrice'   => (float) ($item['unit_price'] ?? $item['price'] ?? 0),
            'lineTotal'   => (float) (($item['quantity'] ?? 1) * ($item['unit_price'] ?? $item['price'] ?? 0)),
        ])->toArray();
    }

    public function adminMetrics(): array
    {
        $totalPatientsToday = VisitToken::whereDate('created_at', Carbon::today())->count();

        return [
            'total_visit_today' => $totalPatientsToday,
            'total_patients'    => Patient::count(),
            'pending_invoices'  => Invoice::whereIn('status', ['draft', 'sent', 'partial', 'overdue'])->count(),
        ];
    }

    public function receptionMetrics(): array
    {
        return [
            'checkins_today' => VisitToken::whereDate('created_at', Carbon::today())->count(),
            'appointments'   => 0,
        ];
    }
}
