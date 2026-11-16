<?php

namespace App\Services\Receptions;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReportService
{
    /**
     * Daily Revenue Collection Report.
     *
     * Uses completed payment transactions, not invoice totals.
     */
    public function dailyRevenueCollection(
        string $from,
        string $to
    ): array {
        $payments = DB::table('payments')
            ->leftJoin('patients', 'patients.id', '=', 'payments.patient_id')
            ->leftJoin('invoices', 'invoices.id', '=', 'payments.invoice_id')
            ->where('payments.status', 'completed')
            ->whereBetween(DB::raw('DATE(payments.payment_date)'), [$from, $to])
            ->select([
                'payments.payment_number',
                'payments.receipt_number',
                'payments.payment_method',
                'payments.total_amount',
                'payments.paid_amount',
                'payments.change_amount',
                'payments.payment_date',
                'payments.transaction_reference',
                'patients.patient_number',
                'patients.first_name',
                'patients.last_name',
                'invoices.invoice_number',
            ])
            ->orderBy('payments.payment_date')
            ->get();

        return [
            'title' => 'Daily Revenue Collection Report',
            'period' => $this->period($from, $to),

            'summary' => [
                'total_transactions' => $payments->count(),
                'total_collected' => (float) $payments->sum('paid_amount'),
                'cash' => $this->paymentTotal($payments, 'cash'),
                'card' => $this->paymentTotal($payments, 'card'),
                'mobile_money' => $this->paymentTotal($payments, 'mobile_money'),
                'bank_transfer' => $this->paymentTotal($payments, 'bank_transfer'),
                'insurance' => $this->paymentTotal($payments, 'insurance'),
            ],

            'payments' => $payments->map(fn($payment) => [
                'payment_number' => $payment->payment_number,
                'receipt_number' => $payment->receipt_number,
                'invoice_number' => $payment->invoice_number,
                'patient_number' => $payment->patient_number,
                'patient_name' => trim(
                    "{$payment->first_name} {$payment->last_name}"
                ),
                'payment_method' => $payment->payment_method,
                'amount' => (float) $payment->paid_amount,
                'change' => (float) $payment->change_amount,
                'transaction_reference' => $payment->transaction_reference,
                'payment_date' => $payment->payment_date,
            ])->values()->all(),
        ];
    }

    /**
     * Billing and Invoicing Report.
     *
     * Includes invoice totals, payments and outstanding balances.
     */
    public function billingAndInvoicing(
        string $from,
        string $to
    ): array {
        $invoices = DB::table('invoices')
            ->leftJoin('patients', 'patients.id', '=', 'invoices.patient_id')
            ->whereNull('invoices.deleted_at')
            ->whereBetween('invoices.issue_date', [$from, $to])
            ->whereNotIn('invoices.status', ['draft', 'cancelled'])
            ->select([
                'invoices.id',
                'invoices.invoice_number',
                'invoices.payment_scheme',
                'invoices.issue_date',
                'invoices.subtotal',
                'invoices.tax',
                'invoices.discount',
                'invoices.total',
                'invoices.paid_amount',
                'invoices.due_amount',
                'invoices.status',
                'invoices.items',
                'patients.patient_number',
                'patients.first_name',
                'patients.last_name',
            ])
            ->orderBy('invoices.issue_date')
            ->get();

        $items = $this->decodeInvoiceItems($invoices);

        return [
            'title' => 'Billing & Invoicing Report',
            'period' => $this->period($from, $to),

            'summary' => [
                'total_invoices' => $invoices->count(),
                'total_billed' => (float) $invoices->sum('total'),
                'total_paid' => (float) $invoices->sum('paid_amount'),
                'total_outstanding' => (float) $invoices->sum('due_amount'),
                'paid_invoices' => $invoices->where('status', 'paid')->count(),
                'partial_invoices' => $invoices->where('status', 'partial')->count(),
                'unpaid_invoices' => $invoices->whereIn(
                    'status',
                    ['unpaid', 'overdue', 'sent']
                )->count(),
            ],

            'invoices' => $invoices->map(function ($invoice) use ($items) {
                return [
                    'invoice_number' => $invoice->invoice_number,
                    'patient_number' => $invoice->patient_number,
                    'patient_name' => trim(
                        "{$invoice->first_name} {$invoice->last_name}"
                    ),
                    'invoice_date' => $invoice->issue_date,
                    'payment_scheme' => $invoice->payment_scheme,
                    'subtotal' => (float) $invoice->subtotal,
                    'tax' => (float) $invoice->tax,
                    'discount' => (float) $invoice->discount,
                    'total' => (float) $invoice->total,
                    'paid_amount' => (float) $invoice->paid_amount,
                    'balance' => (float) $invoice->due_amount,
                    'status' => $invoice->status,
                    'items' => $items->get($invoice->id, []),
                ];
            })->values()->all(),
        ];
    }

    /**
     * Insurance Billing and Claims Report.
     *
     * Lists insured patients, their invoices and itemised services
     * that are available for insurance claim preparation.
     */
    public function insuranceBilling(
        string $from,
        string $to,
        ?string $provider = null
    ): array {
        $query = DB::table('invoices')
            ->join('patients', 'patients.id', '=', 'invoices.patient_id')
            ->whereNull('invoices.deleted_at')
            ->where('invoices.payment_scheme', 'insurance')
            ->whereBetween('invoices.issue_date', [$from, $to])
            ->whereNotIn('invoices.status', ['draft', 'cancelled']);

        if ($provider) {
            $query->where('patients.insurance_provider', $provider);
        }

        $invoices = $query->select([
            'invoices.id',
            'invoices.invoice_number',
            'invoices.visit_token',
            'invoices.issue_date',
            'invoices.total',
            'invoices.paid_amount',
            'invoices.due_amount',
            'invoices.status',
            'invoices.items',
            'patients.patient_number',
            'patients.first_name',
            'patients.last_name',
            'patients.gender',
            'patients.date_of_birth',
            'patients.insurance_provider',
            'patients.insurance_number',
            'patients.insurance_expiry',
            'patients.insurance_status',
        ])
            ->orderBy('invoices.issue_date')
            ->get();

        $claims = $invoices->map(function ($invoice) {
            $items = $this->decodeItems($invoice->items);

            $services = collect($items)->map(function ($item) {
                $quantity = (float) ($item['quantity'] ?? 1);
                $price = (float) ($item['price'] ?? 0);

                return [
                    'service_name' => $item['service_name']
                        ?? $item['drug_name']
                        ?? $item['name']
                        ?? 'Unspecified service',

                    'category' => $item['service_category']
                        ?? $item['category']
                        ?? null,

                    'quantity' => $quantity,
                    'unit_price' => (float) (
                        $item['unit_price']
                        ?? ($quantity > 0 ? $price / $quantity : $price)
                    ),
                    'total' => (float) (
                        $item['total']
                        ?? $price
                    ),

                    // Use the actual service timestamp stored in the
                    // invoice item. Do not invent an access date.
                    'date_accessed' => $item['created_at'] ?? null,
                ];
            })->values();

            return [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'visit_token' => $invoice->visit_token,
                'invoice_date' => $invoice->issue_date,

                'patient' => [
                    'patient_number' => $invoice->patient_number,
                    'name' => trim(
                        "{$invoice->first_name} {$invoice->last_name}"
                    ),
                    'gender' => $invoice->gender,
                    'date_of_birth' => $invoice->date_of_birth,
                ],

                'insurance' => [
                    'provider' => $invoice->insurance_provider,
                    'membership_number' => $invoice->insurance_number,
                    'expiry_date' => $invoice->insurance_expiry,
                    'status' => $invoice->insurance_status,
                ],

                'services' => $services->all(),

                'total_services' => $services->count(),
                'invoice_total' => (float) $invoice->total,
                'amount_paid' => (float) $invoice->paid_amount,
                'outstanding_balance' => (float) $invoice->due_amount,

                // This is a preparation list, not proof that a claim
                // has or has not been submitted.
                'claim_status' => 'Due for Claim Review',
            ];
        })->values();

        return [
            'title' => 'Insurance Billing & Claims Report',
            'period' => $this->period($from, $to),

            'summary' => [
                'total_patients' => $claims->unique('patient.patient_number')->count(),
                'total_invoices' => $claims->count(),
                'total_services' => $claims->sum('total_services'),
                'total_billed' => (float) $claims->sum('invoice_total'),
                'total_paid' => (float) $claims->sum('amount_paid'),
                'outstanding_balance' => (float) $claims->sum('outstanding_balance'),
            ],

            'claims' => $claims->all(),
        ];
    }

    /**
     * Decode invoice items for the billing report.
     */
    private function decodeInvoiceItems(Collection $invoices): Collection
    {
        return $invoices->mapWithKeys(fn($invoice) => [
            $invoice->id => $this->decodeItems($invoice->items),
        ]);
    }

    /**
     * Safely decode the invoice items JSON column.
     */
    private function decodeItems(?string $items): array
    {
        if (!$items) {
            return [];
        }

        $decoded = json_decode($items, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Calculate payment totals by payment method.
     */
    private function paymentTotal(
        Collection $payments,
        string $method
    ): float {
        return (float) $payments
            ->where('payment_method', $method)
            ->sum('paid_amount');
    }

    /**
     * Standard reporting period.
     */
    private function period(string $from, string $to): array
    {
        return [
            'from' => $from,
            'to' => $to,
            'generated_at' => now()->format('Y-m-d H:i:s'),
        ];
    }
}
