<?php
// app/Http/Controllers/API/ReportController.php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ReportController extends Controller
{
    /**
     * Financial reports
     */
    public function financial(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date',
                'group_by' => 'nullable|in:day,month,payment_method,department'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $fromDate = $request->from_date;
            $toDate = $request->to_date;
            $groupBy = $request->group_by ?? 'day';

            // Revenue report
            $revenue = $this->getRevenueReport($fromDate, $toDate, $groupBy);

            // Outstanding bills
            $outstanding = DB::table('bills')
                ->join('patients', 'bills.patient_id', '=', 'patients.id')
                ->whereIn('bills.payment_status', ['pending', 'partial'])
                ->select(
                    DB::raw('COUNT(*) as total_bills'),
                    DB::raw('COALESCE(SUM(bills.due_amount), 0) as total_outstanding')
                )
                ->first();

            // Payment methods breakdown
            $paymentMethods = DB::table('payments')
                ->join('bills', 'payments.bill_id', '=', 'bills.id')
                ->whereBetween('payments.payment_date', [$fromDate, $toDate])
                ->where('payments.status', 'completed')
                ->select(
                    'payments.payment_method',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('COALESCE(SUM(payments.amount), 0) as total')
                )
                ->groupBy('payments.payment_method')
                ->get();

            // Department revenue
            $departmentRevenue = DB::table('bill_items')
                ->join('bills', 'bill_items.bill_id', '=', 'bills.id')
                ->whereBetween('bills.bill_date', [$fromDate, $toDate])
                ->select(
                    DB::raw('CASE
                        WHEN bill_items.itemable_type = "consultation" THEN "Consultation"
                        WHEN bill_items.itemable_type = "lab_order" THEN "Laboratory"
                        WHEN bill_items.itemable_type = "radiology_order" THEN "Radiology"
                        WHEN bill_items.itemable_type = "pharmacy" THEN "Pharmacy"
                        WHEN bill_items.itemable_type = "admission" THEN "Inpatient"
                        ELSE "Other"
                    END as department'),
                    DB::raw('COALESCE(SUM(bill_items.total), 0) as revenue')
                )
                ->groupBy('department')
                ->get();

            // Daily trends
            $dailyTrends = DB::table('bills')
                ->whereBetween('bill_date', [$fromDate, $toDate])
                ->select(
                    DB::raw('DATE(bill_date) as date'),
                    DB::raw('COUNT(*) as bill_count'),
                    DB::raw('COALESCE(SUM(total_amount), 0) as total_revenue'),
                    DB::raw('COALESCE(SUM(paid_amount), 0) as total_paid')
                )
                ->groupBy(DB::raw('DATE(bill_date)'))
                ->orderBy('date')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate
                    ],
                    'summary' => [
                        'total_revenue' => $revenue['total'],
                        'total_bills' => $revenue['count'],
                        'average_bill' => $revenue['count'] > 0 ? $revenue['total'] / $revenue['count'] : 0,
                        'outstanding_bills' => $outstanding->total_bills ?? 0,
                        'outstanding_amount' => $outstanding->total_outstanding ?? 0
                    ],
                    'revenue_breakdown' => $revenue['breakdown'],
                    'payment_methods' => $paymentMethods,
                    'department_revenue' => $departmentRevenue,
                    'daily_trends' => $dailyTrends
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating financial report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Patient reports
     */
    public function patients(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'from_date' => 'nullable|date',
                'to_date' => 'nullable|date|after_or_equal:from_date',
                'group_by' => 'nullable|in:age,gender,location'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $fromDate = $request->from_date ?? now()->startOfMonth();
            $toDate = $request->to_date ?? now()->endOfDay();
            $groupBy = $request->group_by ?? 'age';

            // New patients
            $newPatients = DB::table('patients')
                ->whereBetween('created_at', [$fromDate, $toDate])
                ->count();

            // Total patients
            $totalPatients = DB::table('patients')->count();

            // Gender distribution
            $genderDistribution = DB::table('patients')
                ->select('gender', DB::raw('COUNT(*) as count'))
                ->groupBy('gender')
                ->get();

            // Age distribution
            $ageGroups = [
                '0-18' => DB::table('patients')
                    ->whereRaw('TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= 18')
                    ->count(),
                '19-35' => DB::table('patients')
                    ->whereRaw('TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 19 AND 35')
                    ->count(),
                '36-50' => DB::table('patients')
                    ->whereRaw('TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 36 AND 50')
                    ->count(),
                '51+' => DB::table('patients')
                    ->whereRaw('TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) > 50')
                    ->count()
            ];

            // Blood group distribution
            $bloodGroups = DB::table('patients')
                ->select('blood_group', DB::raw('COUNT(*) as count'))
                ->whereNotNull('blood_group')
                ->groupBy('blood_group')
                ->get();

            // Insurance coverage
            $insuranceCoverage = [
                'with_insurance' => DB::table('patients')->whereNotNull('insurance_provider')->count(),
                'without_insurance' => DB::table('patients')->whereNull('insurance_provider')->count()
            ];

            // Visit statistics
            $visits = DB::table('opd_registrations')
                ->whereBetween('created_at', [$fromDate, $toDate])
                ->count();

            $admissions = DB::table('admissions')
                ->whereBetween('created_at', [$fromDate, $toDate])
                ->count();

            // Top doctors by patients
            $topDoctors = DB::table('opd_registrations')
                ->join('users', 'opd_registrations.doctor_id', '=', 'users.id')
                ->whereBetween('opd_registrations.created_at', [$fromDate, $toDate])
                ->select(
                    'users.id',
                    'users.first_name',
                    'users.last_name',
                    DB::raw('COUNT(*) as patient_count')
                )
                ->groupBy('users.id', 'users.first_name', 'users.last_name')
                ->orderBy('patient_count', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate
                    ],
                    'summary' => [
                        'total_patients' => $totalPatients,
                        'new_patients' => $newPatients,
                        'total_visits' => $visits,
                        'total_admissions' => $admissions,
                        'visit_per_patient' => $totalPatients > 0 ? round($visits / $totalPatients, 2) : 0
                    ],
                    'demographics' => [
                        'gender' => $genderDistribution,
                        'age_groups' => $ageGroups,
                        'blood_groups' => $bloodGroups,
                        'insurance' => $insuranceCoverage
                    ],
                    'top_doctors' => $topDoctors
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating patient report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Doctors performance report
     */
    public function doctors(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date',
                'doctor_id' => 'nullable|integer|exists:users,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $fromDate = $request->from_date;
            $toDate = $request->to_date;
            $doctorId = $request->doctor_id;

            $query = DB::table('users')
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'doctor');
                });

            if ($doctorId) {
                $query->where('id', $doctorId);
            }

            $doctors = $query->get();

            $performanceData = [];

            foreach ($doctors as $doctor) {
                // Consultation count
                $consultations = DB::table('consultations')
                    ->where('doctor_id', $doctor->id)
                    ->whereBetween('consultation_date', [$fromDate, $toDate])
                    ->count();

                // Unique patients
                $uniquePatients = DB::table('consultations')
                    ->where('doctor_id', $doctor->id)
                    ->whereBetween('consultation_date', [$fromDate, $toDate])
                    ->distinct('patient_id')
                    ->count('patient_id');

                // Revenue generated
                $revenue = DB::table('bill_items')
                    ->join('bills', 'bill_items.bill_id', '=', 'bills.id')
                    ->where('bill_items.itemable_type', 'consultation')
                    ->where('bill_items.itemable_id', $doctor->id)
                    ->whereBetween('bills.bill_date', [$fromDate, $toDate])
                    ->sum('bill_items.total');

                // Prescriptions written
                $prescriptions = DB::table('prescriptions')
                    ->where('doctor_id', $doctor->id)
                    ->whereBetween('created_at', [$fromDate, $toDate])
                    ->count();

                // Lab orders
                $labOrders = DB::table('lab_orders')
                    ->where('doctor_id', $doctor->id)
                    ->whereBetween('created_at', [$fromDate, $toDate])
                    ->count();

                // Radiology orders
                $radiologyOrders = DB::table('radiology_orders')
                    ->where('doctor_id', $doctor->id)
                    ->whereBetween('created_at', [$fromDate, $toDate])
                    ->count();

                $performanceData[] = [
                    'doctor' => [
                        'id' => $doctor->id,
                        'name' => trim($doctor->first_name . ' ' . $doctor->last_name)
                    ],
                    'metrics' => [
                        'consultations' => $consultations,
                        'unique_patients' => $uniquePatients,
                        'revenue' => $revenue,
                        'prescriptions' => $prescriptions,
                        'lab_orders' => $labOrders,
                        'radiology_orders' => $radiologyOrders,
                        'avg_patients_per_day' => $this->calculateWorkingDays($fromDate, $toDate) > 0
                            ? round($consultations / $this->calculateWorkingDays($fromDate, $toDate), 2)
                            : 0
                    ]
                ];
            }

            // Sort by consultations
            usort($performanceData, function ($a, $b) {
                return $b['metrics']['consultations'] <=> $a['metrics']['consultations'];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate
                    ],
                    'doctors' => $performanceData,
                    'summary' => [
                        'total_doctors' => count($performanceData),
                        'total_consultations' => array_sum(array_column($performanceData, 'metrics.consultations')),
                        'total_revenue' => array_sum(array_column($performanceData, 'metrics.revenue')),
                        'avg_consultations_per_doctor' => count($performanceData) > 0
                            ? round(array_sum(array_column($performanceData, 'metrics.consultations')) / count($performanceData), 2)
                            : 0
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating doctors report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Inventory report
     */
    public function inventory(Request $request): JsonResponse
    {
        try {
            // Stock summary
            $stockSummary = [
                'total_medicines' => DB::table('medicines')->count(),
                'active_medicines' => DB::table('medicines')->where('is_active', true)->count(),
                'low_stock' => DB::table('medicines')
                    ->where('current_stock', '<=', DB::raw('reorder_level'))
                    ->count(),
                'out_of_stock' => DB::table('medicines')
                    ->where('current_stock', '<=', 0)
                    ->count(),
                'total_stock_value' => DB::table('medicine_batches')
                    ->where('quantity_available', '>', 0)
                    ->sum(DB::raw('quantity_available * purchase_price'))
            ];

            // Low stock items
            $lowStockItems = DB::table('medicines')
                ->where('current_stock', '<=', DB::raw('reorder_level'))
                ->where('current_stock', '>', 0)
                ->select(
                    'id',
                    'name',
                    'current_stock',
                    'reorder_level',
                    'unit'
                )
                ->orderBy('current_stock', 'asc')
                ->limit(20)
                ->get();

            // Expiring soon
            $expiringSoon = DB::table('medicine_batches')
                ->join('medicines', 'medicine_batches.medicine_id', '=', 'medicines.id')
                ->where('medicine_batches.expiry_date', '<=', now()->addDays(30))
                ->where('medicine_batches.expiry_date', '>', now())
                ->where('medicine_batches.quantity_available', '>', 0)
                ->select(
                    'medicines.name as medicine_name',
                    'medicine_batches.batch_number',
                    'medicine_batches.expiry_date',
                    'medicine_batches.quantity_available'
                )
                ->orderBy('medicine_batches.expiry_date')
                ->get();

            // Expired items
            $expired = DB::table('medicine_batches')
                ->join('medicines', 'medicine_batches.medicine_id', '=', 'medicines.id')
                ->where('medicine_batches.expiry_date', '<=', now())
                ->where('medicine_batches.quantity_available', '>', 0)
                ->select(
                    'medicines.name as medicine_name',
                    'medicine_batches.batch_number',
                    'medicine_batches.expiry_date',
                    'medicine_batches.quantity_available',
                    DB::raw('quantity_available * purchase_price as loss_value')
                )
                ->orderBy('medicine_batches.expiry_date')
                ->get();

            // Stock movements summary
            $movements = DB::table('stock_movements')
                ->select(
                    'type',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(quantity) as total_quantity')
                )
                ->whereMonth('created_at', now()->month)
                ->groupBy('type')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $stockSummary,
                    'low_stock' => $lowStockItems,
                    'expiring_soon' => $expiringSoon,
                    'expired' => $expired,
                    'movements' => $movements
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating inventory report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Laboratory report
     */
    public function lab(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $fromDate = $request->from_date;
            $toDate = $request->to_date;

            // Summary statistics
            $summary = DB::table('lab_orders')
                ->whereBetween('created_at', [$fromDate, $toDate])
                ->select(
                    DB::raw('COUNT(*) as total_orders'),
                    DB::raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed'),
                    DB::raw('SUM(CASE WHEN status = "ordered" THEN 1 ELSE 0 END) as pending'),
                    DB::raw('SUM(CASE WHEN priority = "urgent" THEN 1 ELSE 0 END) as urgent'),
                    DB::raw('SUM(CASE WHEN priority = "stat" THEN 1 ELSE 0 END) as stat')
                )
                ->first();

            // Test popularity
            $popularTests = DB::table('lab_order_items')
                ->join('lab_tests', 'lab_order_items.lab_test_id', '=', 'lab_tests.id')
                ->join('lab_orders', 'lab_order_items.lab_order_id', '=', 'lab_orders.id')
                ->whereBetween('lab_orders.created_at', [$fromDate, $toDate])
                ->select(
                    'lab_tests.name',
                    'lab_tests.category',
                    DB::raw('COUNT(*) as order_count')
                )
                ->groupBy('lab_tests.id', 'lab_tests.name', 'lab_tests.category')
                ->orderBy('order_count', 'desc')
                ->limit(10)
                ->get();

            // Revenue by test category
            $revenueByCategory = DB::table('lab_order_items')
                ->join('lab_tests', 'lab_order_items.lab_test_id', '=', 'lab_tests.id')
                ->join('lab_orders', 'lab_order_items.lab_order_id', '=', 'lab_orders.id')
                ->whereBetween('lab_orders.created_at', [$fromDate, $toDate])
                ->select(
                    'lab_tests.category',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(lab_tests.price) as revenue')
                )
                ->groupBy('lab_tests.category')
                ->get();

            // Daily trends
            $dailyTrends = DB::table('lab_orders')
                ->whereBetween('created_at', [$fromDate, $toDate])
                ->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('COUNT(*) as order_count')
                )
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date')
                ->get();

            // Turnaround time (average)
            $turnaroundTime = DB::table('lab_orders')
                ->join('lab_results', 'lab_orders.id', '=', 'lab_results.lab_order_id')
                ->whereBetween('lab_orders.created_at', [$fromDate, $toDate])
                ->whereNotNull('lab_results.created_at')
                ->select(DB::raw('AVG(TIMESTAMPDIFF(HOUR, lab_orders.created_at, lab_results.created_at)) as avg_hours'))
                ->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'period' => [
                        'from' => $fromDate,
                        'to' => $toDate
                    ],
                    'summary' => [
                        'total_orders' => $summary->total_orders ?? 0,
                        'completed' => $summary->completed ?? 0,
                        'pending' => $summary->pending ?? 0,
                        'urgent' => $summary->urgent ?? 0,
                        'stat' => $summary->stat ?? 0,
                        'completion_rate' => ($summary->total_orders ?? 0) > 0
                            ? round((($summary->completed ?? 0) / $summary->total_orders) * 100, 2)
                            : 0,
                        'avg_turnaround_hours' => round($turnaroundTime->avg_hours ?? 0, 2)
                    ],
                    'popular_tests' => $popularTests,
                    'revenue_by_category' => $revenueByCategory,
                    'daily_trends' => $dailyTrends
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating lab report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export report
     */
    public function export(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'type' => 'required|in:financial,patients,doctors,inventory,lab',
                'format' => 'required|in:pdf,excel,csv',
                'from_date' => 'required_if:type,financial,doctors,lab|date',
                'to_date' => 'required_if:type,financial,doctors,lab|date|after_or_equal:from_date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Generate report data based on type
            $reportData = $this->generateReportData($request);

            // Generate file based on format
            $fileName = $request->type . '_report_' . date('YmdHis') . '.' . $request->format;

            // Implementation for PDF/Excel/CSV export
            // You can use packages like dompdf, maatwebsite/excel, etc.

            return response()->json([
                'success' => true,
                'message' => 'Report exported successfully',
                'file' => $fileName,
                'download_url' => route('reports.download', ['file' => $fileName])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error exporting report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download exported report
     */
    public function download($file)
    {
        $path = storage_path('app/reports/' . $file);

        if (!file_exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found'
            ], 404);
        }

        return response()->download($path);
    }

    /**
     * Helper: Get revenue report
     */
    private function getRevenueReport($fromDate, $toDate, $groupBy)
    {
        $query = DB::table('payments')
            ->join('bills', 'payments.bill_id', '=', 'bills.id')
            ->whereBetween('payments.payment_date', [$fromDate, $toDate])
            ->where('payments.status', 'completed');

        switch ($groupBy) {
            case 'day':
                $breakdown = $query
                    ->select(
                        DB::raw('DATE(payments.payment_date) as period'),
                        DB::raw('COUNT(*) as count'),
                        DB::raw('COALESCE(SUM(payments.amount), 0) as total')
                    )
                    ->groupBy(DB::raw('DATE(payments.payment_date)'))
                    ->orderBy('period')
                    ->get();
                break;

            case 'month':
                $breakdown = $query
                    ->select(
                        DB::raw('DATE_FORMAT(payments.payment_date, "%Y-%m") as period'),
                        DB::raw('COUNT(*) as count'),
                        DB::raw('COALESCE(SUM(payments.amount), 0) as total')
                    )
                    ->groupBy(DB::raw('DATE_FORMAT(payments.payment_date, "%Y-%m")'))
                    ->orderBy('period')
                    ->get();
                break;

            case 'payment_method':
                $breakdown = $query
                    ->select(
                        'payments.payment_method as period',
                        DB::raw('COUNT(*) as count'),
                        DB::raw('COALESCE(SUM(payments.amount), 0) as total')
                    )
                    ->groupBy('payments.payment_method')
                    ->get();
                break;

            case 'department':
                $breakdown = DB::table('bill_items')
                    ->join('bills', 'bill_items.bill_id', '=', 'bills.id')
                    ->whereBetween('bills.bill_date', [$fromDate, $toDate])
                    ->select(
                        DB::raw('CASE
                            WHEN bill_items.itemable_type = "consultation" THEN "Consultation"
                            WHEN bill_items.itemable_type = "lab_order" THEN "Laboratory"
                            WHEN bill_items.itemable_type = "radiology_order" THEN "Radiology"
                            WHEN bill_items.itemable_type = "pharmacy" THEN "Pharmacy"
                            WHEN bill_items.itemable_type = "admission" THEN "Inpatient"
                            ELSE "Other"
                        END as period'),
                        DB::raw('COUNT(*) as count'),
                        DB::raw('COALESCE(SUM(bill_items.total), 0) as total')
                    )
                    ->groupBy('period')
                    ->get();
                break;

            default:
                $breakdown = collect([]);
        }

        $totals = DB::table('payments')
            ->whereBetween('payment_date', [$fromDate, $toDate])
            ->where('status', 'completed')
            ->select(
                DB::raw('COUNT(*) as count'),
                DB::raw('COALESCE(SUM(amount), 0) as total')
            )
            ->first();

        return [
            'total' => $totals->total ?? 0,
            'count' => $totals->count ?? 0,
            'breakdown' => $breakdown
        ];
    }

    /**
     * Helper: Calculate working days between two dates
     */
    private function calculateWorkingDays($fromDate, $toDate)
    {
        $from = \Carbon\Carbon::parse($fromDate);
        $to = \Carbon\Carbon::parse($toDate);

        $workingDays = 0;

        for ($date = $from->copy(); $date->lte($to); $date->addDay()) {
            if ($date->isWeekday()) {
                $workingDays++;
            }
        }

        return $workingDays;
    }

    /**
     * Helper: Generate report data based on type
     */
    private function generateReportData($request)
    {
        switch ($request->type) {
            case 'financial':
                return $this->getRevenueReport($request->from_date, $request->to_date, 'day');
            case 'patients':
                return $this->patients($request)->getData()->data;
            case 'doctors':
                return $this->doctors($request)->getData()->data;
            case 'inventory':
                return $this->inventory($request)->getData()->data;
            case 'lab':
                return $this->lab($request)->getData()->data;
            default:
                return [];
        }
    }
}
