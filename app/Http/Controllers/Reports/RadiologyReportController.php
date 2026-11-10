<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Services\Reports\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class RadiologyReportController extends Controller
{
    protected  ReportService $reports;
    public function __construct(
        ReportService $reports,
    ) {
        $this->reports   = $reports;
    }

    /**
     * Generate a laboratory report for the given department.
     *
     * POST /laboratory/reports/{departmentId}
     *
     * Body:
     *   - report_type : patients-seen-department | patients-cash | patients-insurance
     *   - from        : Y-m-d
     *   - to          : Y-m-d
     *   - mode        : day | week | month | custom (optional)
     *
     * Returns JSON consumed by the front-end's generateReportPdf().
     */
    public function getReport(Request $request, int $departmentId): JsonResponse
    {
        $validated = $request->validate([
            'report_type' => ['nullable', 'string'],        // ← was: in:patients-seen-department,patients-cash,patients-insurance
            'from'        => ['required', 'date_format:Y-m-d'],
            'to'          => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'mode'        => ['nullable', 'in:day,week,month,custom'],
        ]);

        try {
            $report = $this->reports->generate(
                $departmentId,
                $validated['from'],
                $validated['to'],
                $validated['report_type'] ?? 'radiology report',   // default
            );

            return response()->json($report);
        } catch (Throwable $e) {
            Log::error('Laboratory report generation failed', [
                'department_id' => $departmentId,
                'report_type'   => $validated['report_type'] ?? null,
                'error'         => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Unable to generate the laboratory report. Please try again.',
            ], 500);
        }
    }

    /**
     * Verify a report via the QR code on the generated PDF.
     *
     * GET /reports/verify/{reportId}/{sig}
     */
    public function verify(string $reportId, string $sig)
    {
        $result = $this->reports->verify($reportId, $sig);

        return view('reports.verify', [
            'reportId' => $reportId,
            'sig'      => $sig,
            'valid'    => $result['valid'],
            'meta'     => $result['meta']    ?? null,
            'summary'  => $result['summary'] ?? null,
            'reason'   => $result['reason']  ?? null,
        ]);
    }
}
