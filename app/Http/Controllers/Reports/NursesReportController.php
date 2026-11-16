<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Services\Nurses\NursesReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NursesReportController extends Controller
{
    public function __construct(
        protected NursesReportService $reportService
    ) {}

    /**
     * Patients Seen in Department
     */
    public function patientsSeenDepartment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from'          => ['required', 'date'],
            'to'            => ['required', 'date', 'after_or_equal:from'],
            'department_id' => ['nullable', 'integer'],
        ]);

        $departmentId = $validated['department_id']
            ?? auth()->user()?->profile?->department_id
            ?? auth()->user()?->profile?->departmentId
            ?? null;

        $report = $this->reportService->generate(
            'patients-seen-department',
            $departmentId,
            $validated['from'],
            $validated['to']
        );

        return response()->json([
            'success' => true,
            'message' => 'Patients seen in department report generated successfully.',
            'data'    => $report,
        ]);
    }

    /**
     * Patients Seen — Cash Paying
     */
    public function patientsCash(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from'          => ['required', 'date'],
            'to'            => ['required', 'date', 'after_or_equal:from'],
            'department_id' => ['nullable', 'integer'],
        ]);

        $departmentId = $validated['department_id']
            ?? auth()->user()?->profile?->department_id
            ?? auth()->user()?->profile?->departmentId
            ?? null;

        $report = $this->reportService->generate(
            'patients-cash',
            $departmentId,
            $validated['from'],
            $validated['to']
        );

        return response()->json([
            'success' => true,
            'message' => 'Cash-paying patients report generated successfully.',
            'data'    => $report,
        ]);
    }

    /**
     * Patients Seen — Insurance
     */
    public function patientsInsurance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from'          => ['required', 'date'],
            'to'            => ['required', 'date', 'after_or_equal:from'],
            'department_id' => ['nullable', 'integer'],
        ]);

        $departmentId = $validated['department_id']
            ?? auth()->user()?->profile?->department_id
            ?? auth()->user()?->profile?->departmentId
            ?? null;

        $report = $this->reportService->generate(
            'patients-insurance',
            $departmentId,
            $validated['from'],
            $validated['to']
        );

        return response()->json([
            'success' => true,
            'message' => 'Insurance patients report generated successfully.',
            'data'    => $report,
        ]);
    }
}
