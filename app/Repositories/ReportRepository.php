<?php
// app/Repositories/ReportRepository.php

namespace App\Repositories;

use Illuminate\Support\Facades\DB;

class ReportRepository extends BaseRepository
{
    protected function setTable(): void
    {
        $this->table = 'reports'; // If you have a reports table
    }

    /**
     * Get financial report
     */
    public function getFinancialReport($fromDate, $toDate, $groupBy = 'day')
    {
        // Revenue by payments
        $revenueQuery = DB::table('payments')
            ->join('bills', 'payments.bill_id', '=', 'bills.id')
            ->whereBetween('payments.payment_date', [$fromDate, $toDate])
            ->where('payments.status', 'completed');

        switch ($groupBy) {
            case 'day':
                $revenueByPeriod = (clone $revenueQuery)
                    ->select(
                        DB::raw('DATE(payments.payment_date) as period'),
                        DB::raw('COUNT(*) as transaction_count'),
                        DB::raw('SUM(payments.amount) as total')
                    )
                    ->groupBy(DB::raw('DATE(payments.payment_date)'))
                    ->orderBy('period')
                    ->get();
                break;

            case 'month':
                $revenueByPeriod = (clone $revenueQuery)
                    ->select(
                        DB::raw('DATE_FORMAT(payments.payment_date, "%Y-%m") as period'),
                        DB::raw('COUNT(*) as transaction_count'),
                        DB::raw('SUM(payments.amount) as total')
                    )
                    ->groupBy(DB::raw('DATE_FORMAT(payments.payment_date, "%Y-%m")'))
                    ->orderBy('period')
                    ->get();
                break;

            case 'payment_method':
                $revenueByPeriod = (clone $revenueQuery)
                    ->select(
                        'payments.payment_method as period',
                        DB::raw('COUNT(*) as transaction_count'),
                        DB::raw('SUM(payments.amount) as total')
                    )
                    ->groupBy('payments.payment_method')
                    ->get();
                break;
        }

        // Summary
        $summary = DB::table('payments')
            ->whereBetween('payment_date', [$fromDate, $toDate])
            ->where('status', 'completed')
            ->select(
                DB::raw('COUNT(*) as total_transactions'),
                DB::raw('SUM(amount) as total_revenue'),
                DB::raw('AVG(amount) as average_transaction')
            )
            ->first();

        // Outstanding bills
        $outstanding = DB::table('bills')
            ->join('patients', 'bills.patient_id', '=', 'patients.id')
            ->whereIn('bills.payment_status', ['pending', 'partial'])
            ->select(
                DB::raw('COUNT(*) as total_bills'),
                DB::raw('SUM(bills.due_amount) as total_outstanding')
            )
            ->first();

        // Department revenue
        $departmentRevenue = DB::table('bill_items')
            ->join('bills', 'bill_items.bill_id', '=', 'bills.id')
            ->whereBetween('bills.bill_date', [$fromDate, $toDate])
            ->select(
                DB::raw('CASE
                    WHEN bill_items.itemable_type = "consultations" THEN "Consultation"
                    WHEN bill_items.itemable_type = "lab_orders" THEN "Laboratory"
                    WHEN bill_items.itemable_type = "radiology_orders" THEN "Radiology"
                    WHEN bill_items.itemable_type = "dispensations" THEN "Pharmacy"
                    WHEN bill_items.itemable_type = "admissions" THEN "Inpatient"
                    ELSE "Other"
                END as department'),
                DB::raw('COUNT(*) as item_count'),
                DB::raw('SUM(bill_items.total) as revenue')
            )
            ->groupBy('department')
            ->get();

        return [
            'period' => [
                'from' => $fromDate,
                'to' => $toDate
            ],
            'summary' => [
                'total_revenue' => $summary->total_revenue ?? 0,
                'total_transactions' => $summary->total_transactions ?? 0,
                'average_transaction' => $summary->average_transaction ?? 0,
                'outstanding_bills' => $outstanding->total_bills ?? 0,
                'outstanding_amount' => $outstanding->total_outstanding ?? 0
            ],
            'revenue_breakdown' => $revenueByPeriod ?? [],
            'department_revenue' => $departmentRevenue
        ];
    }

    /**
     * Get patient report
     */
    public function getPatientReport($fromDate = null, $toDate = null)
    {
        $fromDate = $fromDate ?? now()->startOfMonth();
        $toDate = $toDate ?? now()->endOfDay();

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

        // Insurance coverage
        $insuranceCoverage = [
            'with_insurance' => DB::table('patients')->whereNotNull('insurance_provider')->count(),
            'without_insurance' => DB::table('patients')->whereNull('insurance_provider')->count()
        ];

        // Visit statistics
        $visits = DB::table('visits')
            ->whereBetween('created_at', [$fromDate, $toDate])
            ->count();

        $admissions = DB::table('admissions')
            ->whereBetween('created_at', [$fromDate, $toDate])
            ->count();

        // Top doctors by patients
        $topDoctors = DB::table('consultations')
            ->join('users', 'consultations.doctor_id', '=', 'users.id')
            ->whereBetween('consultations.created_at', [$fromDate, $toDate])
            ->select(
                'users.id',
                'users.first_name',
                'users.last_name',
                DB::raw('COUNT(DISTINCT consultations.patient_id) as unique_patients'),
                DB::raw('COUNT(*) as total_consultations')
            )
            ->groupBy('users.id', 'users.first_name', 'users.last_name')
            ->orderBy('total_consultations', 'desc')
            ->limit(10)
            ->get();

        return [
            'period' => [
                'from' => $fromDate,
                'to' => $toDate
            ],
            'summary' => [
                'total_patients' => $totalPatients,
                'new_patients' => $newPatients,
                'total_visits' => $visits,
                'total_admissions' => $admissions
            ],
            'demographics' => [
                'gender' => $genderDistribution,
                'age_groups' => $ageGroups,
                'insurance' => $insuranceCoverage
            ],
            'top_doctors' => $topDoctors
        ];
    }

    /**
     * Get inventory report
     */
    public function getInventoryReport()
    {
        // Stock summary
        $stockSummary = [
            'total_drugs' => DB::table('drugs')->where('is_active', true)->count(),
            'total_stock_value' => DB::table('drug_stocks')
                ->where('status', 'in_stock')
                ->sum(DB::raw('quantity_available * purchase_price')),
            'total_selling_value' => DB::table('drug_stocks')
                ->where('status', 'in_stock')
                ->sum(DB::raw('quantity_available * selling_price'))
        ];

        // Low stock items
        $lowStock = DB::table('drugs')
            ->where('is_active', true)
            ->get()
            ->filter(function ($drug) {
                $totalStock = DB::table('drug_stocks')
                    ->where('drug_id', $drug->id)
                    ->where('status', 'in_stock')
                    ->sum('quantity_available');

                return $totalStock <= $drug->reorder_level;
            })
            ->map(function ($drug) {
                $totalStock = DB::table('drug_stocks')
                    ->where('drug_id', $drug->id)
                    ->where('status', 'in_stock')
                    ->sum('quantity_available');

                return [
                    'id' => $drug->id,
                    'name' => $drug->name,
                    'current_stock' => $totalStock,
                    'reorder_level' => $drug->reorder_level,
                    'unit' => $drug->unit
                ];
            })
            ->values();

        // Expiring soon
        $expiringSoon = DB::table('drug_stocks as ds')
            ->join('drugs as d', 'ds.drug_id', '=', 'd.id')
            ->where('ds.expiry_date', '<=', now()->addDays(30))
            ->where('ds.expiry_date', '>', now())
            ->where('ds.quantity_available', '>', 0)
            ->where('ds.status', 'in_stock')
            ->select(
                'ds.*',
                'd.name as drug_name',
                'd.unit'
            )
            ->orderBy('ds.expiry_date')
            ->get();

        // Expired
        $expired = DB::table('drug_stocks as ds')
            ->join('drugs as d', 'ds.drug_id', '=', 'd.id')
            ->where('ds.expiry_date', '<=', now())
            ->where('ds.quantity_available', '>', 0)
            ->select(
                'ds.*',
                'd.name as drug_name',
                'd.unit',
                DB::raw('ds.quantity_available * ds.purchase_price as loss_value')
            )
            ->orderBy('ds.expiry_date')
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

        return [
            'summary' => $stockSummary,
            'low_stock' => $lowStock,
            'expiring_soon' => $expiringSoon,
            'expired' => $expired,
            'movements' => $movements
        ];
    }

    /**
     * Get laboratory report
     */
    public function getLaboratoryReport($fromDate, $toDate)
    {
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

        // Revenue
        $revenue = DB::table('lab_order_items as loi')
            ->join('lab_tests as lt', 'loi.lab_test_id', '=', 'lt.id')
            ->join('lab_orders as lo', 'loi.lab_order_id', '=', 'lo.id')
            ->whereBetween('lo.created_at', [$fromDate, $toDate])
            ->sum('lt.price');

        // Top tests
        $topTests = DB::table('lab_order_items as loi')
            ->join('lab_tests as lt', 'loi.lab_test_id', '=', 'lt.id')
            ->join('lab_orders as lo', 'loi.lab_order_id', '=', 'lo.id')
            ->whereBetween('lo.created_at', [$fromDate, $toDate])
            ->select(
                'lt.id',
                'lt.name',
                'lt.category',
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(lt.price) as revenue')
            )
            ->groupBy('lt.id', 'lt.name', 'lt.category')
            ->orderBy('order_count', 'desc')
            ->limit(10)
            ->get();

        // Daily trends
        $dailyTrends = DB::table('lab_orders')
            ->whereBetween('created_at', [$fromDate, $toDate])
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(CASE WHEN priority = "urgent" THEN 1 ELSE 0 END) as urgent_count')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        return [
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
                'revenue' => $revenue
            ],
            'top_tests' => $topTests,
            'daily_trends' => $dailyTrends
        ];
    }

    /**
     * Get radiology report
     */
    public function getRadiologyReport($fromDate, $toDate)
    {
        // Summary statistics
        $summary = DB::table('radiology_orders')
            ->whereBetween('created_at', [$fromDate, $toDate])
            ->select(
                DB::raw('COUNT(*) as total_orders'),
                DB::raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed'),
                DB::raw('SUM(CASE WHEN status = "ordered" THEN 1 ELSE 0 END) as pending')
            )
            ->first();

        // Revenue
        $revenue = DB::table('radiology_order_items as roi')
            ->join('radiology_procedures as rp', 'roi.radiology_procedure_id', '=', 'rp.id')
            ->join('radiology_orders as ro', 'roi.radiology_order_id', '=', 'ro.id')
            ->whereBetween('ro.created_at', [$fromDate, $toDate])
            ->sum('rp.price');

        // By modality
        $byModality = DB::table('radiology_order_items as roi')
            ->join('radiology_procedures as rp', 'roi.radiology_procedure_id', '=', 'rp.id')
            ->join('radiology_orders as ro', 'roi.radiology_order_id', '=', 'ro.id')
            ->whereBetween('ro.created_at', [$fromDate, $toDate])
            ->select(
                'rp.modality',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(rp.price) as revenue')
            )
            ->groupBy('rp.modality')
            ->get();

        return [
            'period' => [
                'from' => $fromDate,
                'to' => $toDate
            ],
            'summary' => [
                'total_orders' => $summary->total_orders ?? 0,
                'completed' => $summary->completed ?? 0,
                'pending' => $summary->pending ?? 0,
                'completion_rate' => ($summary->total_orders ?? 0) > 0
                    ? round((($summary->completed ?? 0) / $summary->total_orders) * 100, 2)
                    : 0,
                'revenue' => $revenue
            ],
            'by_modality' => $byModality
        ];
    }

    /**
     * Get doctors performance report
     */
    public function getDoctorsReport($fromDate, $toDate, $doctorId = null)
    {
        $query = DB::table('consultations as c')
            ->join('users as d', 'c.doctor_id', '=', 'd.id')
            ->leftJoin('prescriptions as p', 'c.id', '=', 'p.consultation_id')
            ->leftJoin('lab_orders as lo', 'c.id', '=', 'lo.consultation_id')
            ->leftJoin('radiology_orders as ro', 'c.id', '=', 'ro.consultation_id')
            ->whereBetween('c.created_at', [$fromDate, $toDate]);

        if ($doctorId) {
            $query->where('c.doctor_id', $doctorId);
        }

        $doctorStats = $query
            ->select(
                'd.id',
                'd.first_name',
                'd.last_name',
                DB::raw('COUNT(DISTINCT c.id) as consultations'),
                DB::raw('COUNT(DISTINCT c.patient_id) as unique_patients'),
                DB::raw('COUNT(DISTINCT p.id) as prescriptions'),
                DB::raw('COUNT(DISTINCT lo.id) as lab_orders'),
                DB::raw('COUNT(DISTINCT ro.id) as radiology_orders')
            )
            ->groupBy('d.id', 'd.first_name', 'd.last_name')
            ->orderBy('consultations', 'desc')
            ->get();

        // Revenue by doctor
        $revenueByDoctor = DB::table('bill_items')
            ->join('bills', 'bill_items.bill_id', '=', 'bills.id')
            ->join('consultations', function ($join) {
                $join->on('bills.billable_id', '=', 'consultations.id')
                    ->where('bills.billable_type', '=', 'consultations');
            })
            ->join('users as d', 'consultations.doctor_id', '=', 'd.id')
            ->whereBetween('bills.bill_date', [$fromDate, $toDate])
            ->select(
                'd.id',
                'd.first_name',
                'd.last_name',
                DB::raw('SUM(bill_items.total) as revenue')
            )
            ->groupBy('d.id', 'd.first_name', 'd.last_name')
            ->get();

        return [
            'period' => [
                'from' => $fromDate,
                'to' => $toDate
            ],
            'doctors' => $doctorStats,
            'revenue' => $revenueByDoctor
        ];
    }

    /**
     * Get dashboard metrics
     */
    public function getDashboardMetrics()
    {
        $today = today();

        // Today's metrics
        $todayPatients = DB::table('visits')->whereDate('created_at', $today)->count();
        $todayRevenue = DB::table('payments')
            ->whereDate('payment_date', $today)
            ->where('status', 'completed')
            ->sum('amount');
        $todayAppointments = DB::table('appointments')
            ->whereDate('appointment_date', $today)
            ->count();

        // Pending items
        $pendingLab = DB::table('lab_orders')->where('status', 'ordered')->count();
        $pendingRadiology = DB::table('radiology_orders')->where('status', 'ordered')->count();
        $pendingBills = DB::table('bills')
            ->whereIn('payment_status', ['pending', 'partial'])
            ->count();

        // Low stock alerts
        $lowStockCount = DB::table('drugs')
            ->where('is_active', true)
            ->get()
            ->filter(function ($drug) {
                $totalStock = DB::table('drug_stocks')
                    ->where('drug_id', $drug->id)
                    ->where('status', 'in_stock')
                    ->sum('quantity_available');

                return $totalStock <= $drug->reorder_level;
            })
            ->count();

        // Active patients
        $activePatients = DB::table('admissions')
            ->where('status', 'admitted')
            ->count();

        return [
            'today' => [
                'patients' => $todayPatients,
                'revenue' => $todayRevenue,
                'appointments' => $todayAppointments
            ],
            'pending' => [
                'lab_orders' => $pendingLab,
                'radiology_orders' => $pendingRadiology,
                'bills' => $pendingBills
            ],
            'alerts' => [
                'low_stock' => $lowStockCount
            ],
            'active' => [
                'admissions' => $activePatients
            ]
        ];
    }
}
