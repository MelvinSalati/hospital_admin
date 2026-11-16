<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Services\Receptions\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReceptionReportController extends Controller
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    /**
     * Daily Revenue Collection Report.
     */
    public function dailyRevenueCollection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to'   => ['required', 'date', 'after_or_equal:from'],
        ]);

        $report = $this->reportService->dailyRevenueCollection(
            $validated['from'],
            $validated['to']
        );

        return response()->json([
            'success' => true,
            'message' => 'Daily revenue collection report generated successfully.',
            'data'    => $report,
        ]);
    }

    /**
     * Billing and Invoicing Report.
     */
    public function billingAndInvoicing(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to'   => ['required', 'date', 'after_or_equal:from'],
        ]);

        $report = $this->reportService->billingAndInvoicing(
            $validated['from'],
            $validated['to']
        );

        return response()->json([
            'success' => true,
            'message' => 'Billing and invoicing report generated successfully.',
            'data'    => $report,
        ]);
    }

    /**
     * Insurance Billing and Claims Report.
     */
    public function insuranceBilling(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from'     => ['required', 'date'],
            'to'       => ['required', 'date', 'after_or_equal:from'],
            'provider' => ['nullable', 'string', 'max:255'],
        ]);

        $report = $this->reportService->insuranceBilling(
            $validated['from'],
            $validated['to'],
            $validated['provider'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Insurance billing report generated successfully.',
            'data'    => $report,
        ]);
    }
}
