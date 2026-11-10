<?php

namespace App\Repositories\Reports;


use App\Models\Patients\Invoice;
use App\Models\Patients\Payment;
use App\Models\Patients\ImagingOrder;
use App\Models\Patients\ImagingOrderItem;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ReportRepository
{
    public function getReport(int $departmentId, string $from, string $to, ?string $reportType = null): array
    {
        return match ($departmentId) {
            3 => $this->laboratory($from, $to, $reportType),
            5 => $this->radiology($from, $to, $reportType),
            default => throw new \InvalidArgumentException(
                "Unsupported department: {$departmentId}"
            ),
        };
    }

    /**
     * Laboratory report.
     *
     * Pulls all *laboratory* line items from invoices, then joins each
     * invoice to its payments and patient. Payments are categorised by
     * payment_method: 'cash' (plus 'mobile_money'/'card' if you want to
     * lump them into cash) vs 'insurance'.
     */
    public function laboratory(string $from, string $to, ?string $reportType = null): array
    {
        $fromDate = \Carbon\Carbon::parse($from)->startOfDay();
        $toDate   = \Carbon\Carbon::parse($to)->endOfDay();

        // 1. Get ALL completed payments in the date range
        $payments = Payment::query()
            ->with(['invoice.patient', 'invoice.user'])
            ->whereBetween('payment_date', [$fromDate, $toDate])
            ->where('status', 'completed')
            ->get();

        $patientsSeen      = [];
        $cashPayments      = [];
        $insurancePayments = [];
        $seenPatientIds    = []; // To count unique patients correctly

        foreach ($payments as $payment) {
            // 2. Read the enum cleanly (handles enum cast OR raw string)
            $raw     = $payment->payment_method;
            $method  = $raw instanceof \BackedEnum ? $raw->value : (string) $raw;
            $method  = strtolower(trim($method));

            $isInsurance = ($method === 'insurance');
            $isCash      = in_array($method, ['cash', 'mobile_money', 'bank_transfer'], true);

            // Skip completely unknown methods (prevents fatal errors)
            if (!$isInsurance && !$isCash) {
                continue;
            }

            $invoice = $payment->invoice;
            $patient = $invoice?->patient;

            // Track unique patients seen
            $patientId = $patient?->id ?? $invoice?->patient_id ?? $payment->patient_id;
            if ($patientId) {
                $seenPatientIds[$patientId] = true;
            }

            // 3. Extract Lab Items (Fallback to empty collection if missing)
            $labItems = collect();
            if ($invoice) {
                $labItems = collect($invoice->items ?? [])
                    ->filter(
                        fn($item) => (($item['service_category'] ?? null) === 'Laboratory')
                            || (($item['type'] ?? null) === 'laboratory')
                    )
                    ->values();
            }

            // 4. Calculate Amount (No zero-math errors)
            $invoiceTotal = (float) ($invoice?->total ?? 0);
            $labSubtotal  = (float) $labItems->sum('total');

            // If we can't match lab items, just use the full payment amount. 
            // Don't hide it just because the math doesn't perfectly apportion!
            $labShare = ($invoiceTotal > 0 && $labSubtotal > 0)
                ? min(1, $labSubtotal / $invoiceTotal)
                : 1;

            $labPaid = round((float) ($payment->paid_amount ?? 0) * $labShare, 2);

            // 5. Time & Names
            $timeStr = \Carbon\Carbon::parse($payment->payment_date)->format('H:i');

            $patientName = $patient?->name
                ?? $patient?->full_name
                ?? $invoice?->customer_name
                ?? 'Unknown Patient';

            $patientNo = $patient?->patient_number
                ?? $patient?->patient_no
                ?? $invoice?->patient_id
                ?? $payment->patient_id
                ?? 'N/A';

            $testNames = $labItems->isNotEmpty()
                ? $labItems->pluck('service_name')->implode(', ')
                : 'Laboratory Services';

            // 6. Populate "Patients Seen"
            if ($labItems->isNotEmpty()) {
                foreach ($labItems as $item) {
                    $patientsSeen[] = [
                        'patient_no'   => (string) $patientNo,
                        'name'         => $patientName,
                        'gender'       => $patient?->gender ?? '-',
                        'age'          => $patient?->age ?? '-',
                        'test'         => $item['service_name'] ?? '-',
                        'payment_type' => $isInsurance ? 'insurance' : 'cash',
                        'time'         => $timeStr,
                    ];
                }
            } else {
                // Even without lab items, show the patient was seen
                $patientsSeen[] = [
                    'patient_no'   => (string) $patientNo,
                    'name'         => $patientName,
                    'gender'       => $patient?->gender ?? '-',
                    'age'          => $patient?->age ?? '-',
                    'test'         => 'Laboratory Services',
                    'payment_type' => $isInsurance ? 'insurance' : 'cash',
                    'time'         => $timeStr,
                ];
            }

            // 7. Populate Cash / Insurance Tables
            if ($isInsurance) {
                $insurancePayments[] = [
                    'claim_no'     => $payment->transaction_reference
                        ?? $payment->payment_number
                        ?? '-',
                    'patient_no'   => (string) $patientNo,
                    'patient_name' => $patientName,
                    'payer'        => 'Insurance',
                    'test'         => $testNames,
                    'amount'       => $labPaid,
                    'time'         => $timeStr,
                ];
            } elseif ($isCash) {
                $cashPayments[] = [
                    'receipt_no'   => $payment->receipt_number
                        ?? $payment->payment_number
                        ?? '-',
                    'patient_no'   => (string) $patientNo,
                    'patient_name' => $patientName,
                    'test'         => $testNames,
                    'amount'       => $labPaid,
                    'collected_by' => $invoice?->user?->name ?? 'Cashier',
                    'time'         => $timeStr,
                ];
            }
        }

        // -------- Summary --------
        $cashTotal = round(array_sum(array_column($cashPayments, 'amount')), 2);
        $insTotal  = round(array_sum(array_column($insurancePayments, 'amount')), 2);
        $uniquePatients = count($seenPatientIds);

        $reportId = 'LAB-' . $fromDate->format('Ymd') . '-' . strtoupper(\Illuminate\Support\Str::random(6));

        return [
            'meta' => [
                'title'        => 'Laboratory Report',
                'department'   => 'Laboratory Department',
                'range_label'  => $this->formatRangeLabel($from, $to),
                'from'         => $from,
                'to'           => $to,
                'generated_at' => now()->format('Y-m-d H:i'),
                'report_id'    => $reportId,
                'verify_url'   => route('reports.verify', [
                    'reportId' => $reportId,
                    'sig'      => 'pending',
                ]),
            ],
            'summary' => [
                'total_seen'         => $uniquePatients,
                'cash_patients'      => count($cashPayments),
                'cash_amount'        => $cashTotal,
                'insurance_patients' => count($insurancePayments),
                'insurance_amount'   => $insTotal,
            ],
            'patients_seen'      => $patientsSeen,
            'cash_payments'      => $cashPayments,
            'insurance_payments' => $insurancePayments,
        ];
    }
    private function formatRangeLabel(string $from, string $to): string
    {
        $f = Carbon::parse($from);
        $t = Carbon::parse($to);

        if ($f->isSameDay($t)) {
            return $f->format('D, d M Y');
        }
        return $f->format('d M Y') . ' – ' . $t->format('d M Y');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'invoice_id', 'id');
    }

    /**
     * Radiology (Imaging) report.
     *
     * Mirrors laboratory(): walks completed payments in the window, resolves
     * the imaging order(s) tied to each invoice, loads imaging_order_items
     * for modality/body-part/test names, and apportions the paid amount to
     * the imaging share of the invoice.
     */
    public function radiology(string $from, string $to, ?string $reportType = null): array
    {
        $fromDate = \Carbon\Carbon::parse($from)->startOfDay();
        $toDate   = \Carbon\Carbon::parse($to)->endOfDay();

        // 1. Completed payments in range
        $payments = Payment::query()
            ->with(['invoice.patient', 'invoice.user'])
            ->whereBetween('payment_date', [$fromDate, $toDate])
            ->where('status', 'completed')
            ->get();

        // Pre-load imaging orders for the invoices in play (avoids N+1)
        $invoiceIds = $payments->pluck('invoice_id')->filter()->unique()->values();
        $ordersByInvoice = ImagingOrder::query()
            ->with('items')
            ->whereIn('invoice_id', $invoiceIds)
            ->get()
            ->groupBy('invoice_id');

        $patientsSeen      = [];
        $cashPayments      = [];
        $insurancePayments = [];
        $seenPatientIds    = [];

        foreach ($payments as $payment) {
            // 2. Normalise payment method
            $raw    = $payment->payment_method;
            $method = $raw instanceof \BackedEnum ? $raw->value : (string) $raw;
            $method = strtolower(trim($method));

            $isInsurance = ($method === 'insurance');
            $isCash      = in_array($method, ['cash', 'mobile_money', 'bank_transfer'], true);

            if (!$isInsurance && !$isCash) {
                continue;
            }

            $invoice = $payment->invoice;
            $patient = $invoice?->patient;

            // 3. Imaging orders for this invoice (could be >1 if invoice bundled orders)
            $orders = $ordersByInvoice->get($invoice?->id) ?? collect();

            // If there is no imaging order attached to this invoice, skip —
            // this payment wasn't for radiology.
            if ($orders->isEmpty()) {
                continue;
            }

            // 4. Collect all items across those orders
            $imagingItems = $orders->flatMap(fn($o) => $o->items)->values();

            // 5. Patient tracking
            $patientId = $patient?->id ?? $invoice?->patient_id ?? $payment->patient_id;
            if ($patientId) {
                $seenPatientIds[$patientId] = true;
            }

            // 6. Amount apportioning
            $invoiceTotal     = (float) ($invoice?->total ?? 0);
            $imagingSubtotal  = (float) $orders->sum('total_amount');
            if ($imagingSubtotal <= 0) {
                // Fall back to summing items if order totals are null
                $imagingSubtotal = (float) $imagingItems->sum('total');
            }

            $imagingShare = ($invoiceTotal > 0 && $imagingSubtotal > 0)
                ? min(1, $imagingSubtotal / $invoiceTotal)
                : 1;

            $imagingPaid = round((float) ($payment->paid_amount ?? 0) * $imagingShare, 2);

            // 7. Time + names
            $timeStr = \Carbon\Carbon::parse($payment->payment_date)->format('H:i');

            $patientName = $patient?->name
                ?? $patient?->full_name
                ?? $invoice?->customer_name
                ?? 'Unknown Patient';

            $patientNo = $patient?->patient_number
                ?? $patient?->patient_no
                ?? $invoice?->patient_id
                ?? $payment->patient_id
                ?? 'N/A';

            // 8. Test names — prefer service_name, fall back to "Modality - Body Part"
            $testNames = $imagingItems->isNotEmpty()
                ? $imagingItems->map(function ($item) {
                    $name = $item->service_name;
                    if ($name) {
                        return $name;
                    }
                    return trim(($item->modality ?? '') . ' ' . ($item->body_part ?? '')) ?: 'Imaging Study';
                })->implode(', ')
                : 'Radiology Services';

            // 9. Patients seen rows — one per item (matches lab behaviour)
            if ($imagingItems->isNotEmpty()) {
                foreach ($imagingItems as $item) {
                    $patientsSeen[] = [
                        'patient_no'   => (string) $patientNo,
                        'name'         => $patientName,
                        'gender'       => $patient?->gender ?? '-',
                        'age'          => $patient?->age ?? '-',
                        'test'         => $item->service_name
                            ?? trim(($item->modality ?? '') . ' ' . ($item->body_part ?? ''))
                            ?: 'Imaging Study',
                        'modality'     => $item->modality ?? '-',
                        'body_part'    => $item->body_part ?? '-',
                        'priority'     => $item->priority ?? 'routine',
                        'payment_type' => $isInsurance ? 'insurance' : 'cash',
                        'time'         => $timeStr,
                    ];
                }
            } else {
                $patientsSeen[] = [
                    'patient_no'   => (string) $patientNo,
                    'name'         => $patientName,
                    'gender'       => $patient?->gender ?? '-',
                    'age'          => $patient?->age ?? '-',
                    'test'         => 'Radiology Services',
                    'modality'     => '-',
                    'body_part'    => '-',
                    'priority'     => 'routine',
                    'payment_type' => $isInsurance ? 'insurance' : 'cash',
                    'time'         => $timeStr,
                ];
            }

            // 10. Cash / Insurance tables
            if ($isInsurance) {
                $insurancePayments[] = [
                    'claim_no'     => $payment->transaction_reference
                        ?? $payment->payment_number
                        ?? '-',
                    'patient_no'   => (string) $patientNo,
                    'patient_name' => $patientName,
                    'payer'        => 'Insurance',
                    'test'         => $testNames,
                    'modality'     => $imagingItems->pluck('modality')->filter()->unique()->implode(', ') ?: '-',
                    'amount'       => $imagingPaid,
                    'time'         => $timeStr,
                ];
            } elseif ($isCash) {
                $cashPayments[] = [
                    'receipt_no'   => $payment->receipt_number
                        ?? $payment->payment_number
                        ?? '-',
                    'patient_no'   => (string) $patientNo,
                    'patient_name' => $patientName,
                    'test'         => $testNames,
                    'modality'     => $imagingItems->pluck('modality')->filter()->unique()->implode(', ') ?: '-',
                    'amount'       => $imagingPaid,
                    'collected_by' => $invoice?->user?->name ?? 'Cashier',
                    'time'         => $timeStr,
                ];
            }
        }

        // --- Summary ---
        $cashTotal = round(array_sum(array_column($cashPayments, 'amount')), 2);
        $insTotal  = round(array_sum(array_column($insurancePayments, 'amount')), 2);

        $reportId = 'RAD-' . $fromDate->format('Ymd') . '-' . strtoupper(\Illuminate\Support\Str::random(6));

        return [
            'meta' => [
                'title'        => 'Radiology Report',
                'department'   => 'Radiology Department',
                'range_label'  => $this->formatRangeLabel($from, $to),
                'from'         => $from,
                'to'           => $to,
                'generated_at' => now()->format('Y-m-d H:i'),
                'report_id'    => $reportId,
                'verify_url'   => route('reports.verify', [
                    'reportId' => $reportId,
                    'sig'      => 'pending',
                ]),
            ],
            'summary' => [
                'total_seen'         => count($seenPatientIds),
                'cash_patients'      => count($cashPayments),
                'cash_amount'        => $cashTotal,
                'insurance_patients' => count($insurancePayments),
                'insurance_amount'   => $insTotal,
            ],
            'patients_seen'      => $patientsSeen,
            'cash_payments'      => $cashPayments,
            'insurance_payments' => $insurancePayments,
        ];
    }
}
