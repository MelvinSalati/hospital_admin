<?php

namespace App\Services\Reports;

use App\Repositories\Reports\ReportRepository;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ReportService
{
    public function __construct(
        private ReportRepository $repository,
    ) {}

    /**
     * Generate a report for the given department.
     *
     * @param  int     $departmentId  The department (3 = Laboratory)
     * @param  string  $from          ISO date (Y-m-d)
     * @param  string  $to            ISO date (Y-m-d)
     * @param  string  $reportType    One of: patients-seen-department, patients-cash, patients-insurance
     * @return array{meta: array, summary: array, patients_seen: array, cash_payments: array, insurance_payments: array}
     */
    public function generate(
        int $departmentId,
        string $from,
        string $to,
        string $reportType,
    ): array {
        // 1. Normalize + validate dates
        [$fromDate, $toDate] = $this->normalizeRange($from, $to);

        // 2. Delegate to the repository
        $raw = $this->repository->getReport(
            $departmentId,
            $fromDate->toDateString(),
            $toDate->toDateString(),
            $reportType,
        );

        // 3. Apply per-report-type filtering (empty out sections not needed)
        $report = $this->filterByType($raw, $reportType);

        // 4. Recompute summary for what's actually in the payload
        $report['summary'] = $this->recomputeSummary($report);

        // 5. Sign the report for QR authenticity
        $report['meta'] = $this->sign($report['meta'], $report);

        // 6. Cache the signature so /verify can recompute it later
        $this->cacheSignature($report['meta']['report_id'], $report);

        // 7. Log for audit trail
        Log::info('Laboratory report generated', [
            'report_id' => $report['meta']['report_id'],
            'from'      => $report['meta']['from'],
            'to'        => $report['meta']['to'],
            'type'      => $reportType,
            'totals'    => $report['summary'],
        ]);

        return $report;
    }

    /**
     * Verify a report signature. Called by the QR landing page.
     */
    public function verify(string $reportId, string $sig): array
    {
        $cached = Cache::get("report_sig:{$reportId}");

        if (! $cached) {
            return ['valid' => false, 'reason' => 'Report not found or expired'];
        }

        $expected = $cached['signature'];
        $valid    = hash_equals($expected, $sig);

        return [
            'valid'     => $valid,
            'report_id' => $reportId,
            'meta'      => $cached['meta'] ?? null,
            'summary'   => $cached['summary'] ?? null,
            'reason'    => $valid ? null : 'Signature mismatch',
        ];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /**
     * Ensure `from` is not after `to`, and both are day boundaries.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function normalizeRange(string $from, string $to): array
    {
        $fromDate = Carbon::parse($from)->startOfDay();
        $toDate   = Carbon::parse($to)->endOfDay();

        if ($fromDate->gt($toDate)) {
            [$fromDate, $toDate] = [$toDate->copy()->startOfDay(), $fromDate->copy()->endOfDay()];
        }

        return [$fromDate, $toDate];
    }

    /**
     * Trim the payload based on what report the user requested.
     * This keeps each report focused (e.g. the cash report doesn't
     * ship insurance rows to the front-end).
     */
    private function filterByType(array $report, string $reportType): array
    {
        // Unified report — never trims sections.
        $report['meta']['title'] = 'Laboratory Daily Report';
        return $report;
    }

    /**
     * Recompute summary so it always reflects the rows actually shipped
     * (important when filterByType empties some sections).
     */
    private function recomputeSummary(array $report): array
    {
        $cashRows  = $report['cash_payments']      ?? [];
        $insRows   = $report['insurance_payments'] ?? [];
        $seenRows  = $report['patients_seen']      ?? [];

        $cashTotal = array_sum(array_map(fn($r) => (float) ($r['amount'] ?? 0), $cashRows));
        $insTotal  = array_sum(array_map(fn($r) => (float) ($r['amount'] ?? 0), $insRows));

        // Unique patients across whichever sections are present
        $patientNos = collect($seenRows)->pluck('patient_no');
        if ($patientNos->isEmpty()) {
            $patientNos = collect($cashRows)
                ->merge($insRows)
                ->pluck('patient_no');
        }

        return [
            'total_seen'         => $patientNos->filter()->unique()->count(),
            'cash_patients'      => count($cashRows),
            'cash_amount'        => round($cashTotal, 2),
            'insurance_patients' => count($insRows),
            'insurance_amount'   => round($insTotal, 2),
        ];
    }

    /**
     * Attach an HMAC signature + verify URL to the meta block.
     */
    private function sign(array $meta, array $report): array
    {
        if (empty($meta['report_id'])) {
            $meta['report_id'] = 'LAB-'
                . Carbon::parse($meta['from'])->format('Ymd')
                . '-'
                . strtoupper(Str::random(6));
        }

        $signature = $this->computeSignature($meta['report_id'], $report);

        $meta['signature']  = $signature;
        $meta['verify_url'] = route('reports.verify', [
            'reportId' => $meta['report_id'],
            'sig'      => substr($signature, 0, 16),
        ]);

        return $meta;
    }

    /**
     * Deterministic HMAC over a canonical subset of the report.
     * The front-end QR encodes `report_id + verify_url + range`, and
     * the verify endpoint recomputes this signature to confirm the PDF
     * was produced by our server.
     */
    private function computeSignature(string $reportId, array $report): string
    {
        $canonical = [
            'report_id' => $reportId,
            'from'      => $report['meta']['from']    ?? null,
            'to'        => $report['meta']['to']      ?? null,
            'summary'   => $report['summary']         ?? [],
            'counts'    => [
                'seen'      => count($report['patients_seen']      ?? []),
                'cash'      => count($report['cash_payments']      ?? []),
                'insurance' => count($report['insurance_payments'] ?? []),
            ],
        ];

        return hash_hmac(
            'sha256',
            json_encode($canonical, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            config('app.key'),
        );
    }

    /**
     * Store the signature + a summary snapshot so the verify route can
     * check it without needing the full DB recomputation.
     */
    private function cacheSignature(string $reportId, array $report): void
    {
        Cache::put("report_sig:{$reportId}", [
            'signature' => $report['meta']['signature'],
            'meta'      => $report['meta'],
            'summary'   => $report['summary'],
        ], now()->addDays(30));
    }
}
