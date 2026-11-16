<?php

namespace App\Services\Nurses;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class NursesReportService
{
    /**
     * Generate the requested report data.
     *
     * @param  string  $reportId   One of: patients-seen-department | patients-cash | patients-insurance
     * @param  int|string|null  $departmentId
     * @param  string  $from       Y-m-d
     * @param  string  $to         Y-m-d
     * @return array
     */
    public function generate(string $reportId, $departmentId, string $from, string $to): array
    {
        $from = Carbon::parse($from)->startOfDay();
        $to   = Carbon::parse($to)->endOfDay();

        return match ($reportId) {
            'patients-seen-department' => $this->patientsSeenInDepartment($departmentId, $from, $to),
            'patients-cash'            => $this->patientsCashPaying($departmentId, $from, $to),
            'patients-insurance'       => $this->patientsInsurance($departmentId, $from, $to),
            default                    => throw new \InvalidArgumentException("Unknown report: {$reportId}"),
        };
    }

    /* ------------------------------------------------------------------
     | 1. Patients Seen in Department
     |    Breakdown by day, gender, age group, attending nurse
     * ----------------------------------------------------------------*/


    public function patientsSeenInDepartment($departmentId, Carbon $from, Carbon $to): array
    {
        $base = DB::table('patient_visits as v')
            ->join('patients as p', 'p.id', '=', 'v.patient_id')
            ->leftJoin('users as n', 'n.id', '=', 'v.created_by')
            ->whereBetween('v.created_at', [
                $from->copy()->startOfDay(),
                $to->copy()->endOfDay()
            ])
            ->when(
                $departmentId,
                fn($q) =>
                $q->where('v.department_id', $departmentId)
            )
            ->whereIn('v.status', ['completed', 'attended', 'discharged']);

        // Summary totals
        $summary = (clone $base)
            ->selectRaw('
            COUNT(DISTINCT v.id) as total_visits,
            COUNT(DISTINCT v.patient_id) as unique_patients,
            COUNT(DISTINCT CASE
                WHEN LOWER(p.gender) = "male" THEN v.id
            END) as male,
            COUNT(DISTINCT CASE
                WHEN LOWER(p.gender) = "female" THEN v.id
            END) as female
        ')
            ->first();

        // By day
        $byDay = (clone $base)
            ->selectRaw('
            DATE(v.created_at) as date,
            COUNT(DISTINCT v.id) as visits,
            COUNT(DISTINCT v.patient_id) as patients
        ')
            ->groupByRaw('DATE(v.created_at)')
            ->orderBy('date')
            ->get();

        // By gender
        $byGender = (clone $base)
            ->selectRaw('
            LOWER(p.gender) as gender,
            COUNT(DISTINCT v.id) as visits,
            COUNT(DISTINCT v.patient_id) as patients
        ')
            ->groupByRaw('LOWER(p.gender)')
            ->get()
            ->keyBy('gender');

        // By age group
        $byAgeGroup = (clone $base)
            ->selectRaw('
            CASE
                WHEN TIMESTAMPDIFF(YEAR, p.date_of_birth, v.created_at) < 5 THEN "0-4"
                WHEN TIMESTAMPDIFF(YEAR, p.date_of_birth, v.created_at) < 12 THEN "5-11"
                WHEN TIMESTAMPDIFF(YEAR, p.date_of_birth, v.created_at) < 18 THEN "12-17"
                WHEN TIMESTAMPDIFF(YEAR, p.date_of_birth, v.created_at) < 35 THEN "18-34"
                WHEN TIMESTAMPDIFF(YEAR, p.date_of_birth, v.created_at) < 50 THEN "35-49"
                WHEN TIMESTAMPDIFF(YEAR, p.date_of_birth, v.created_at) < 65 THEN "50-64"
                ELSE "65+"
            END as age_group,
            COUNT(DISTINCT v.id) as visits,
            COUNT(DISTINCT v.patient_id) as patients
        ')
            ->groupBy('age_group')
            ->orderByRaw('MIN(TIMESTAMPDIFF(YEAR, p.date_of_birth, v.created_at))')
            ->get();

        // By attending nurse
        $byNurse = (clone $base)
            ->selectRaw('
            v.created_by as nurse_id,
            COALESCE(n.name, "Unassigned") as nurse_name,
            COUNT(DISTINCT v.id) as visits,
            COUNT(DISTINCT v.patient_id) as patients
        ')
            ->groupBy('v.created_by', 'n.name')
            ->orderByDesc('visits')
            ->get();

        // Detailed patient visits
        $details = (clone $base)
            ->select([
                'v.id as visit_id',
                'v.created_at',
                'p.id as patient_id',
                'p.patient_number',
                DB::raw("
                CONCAT(p.first_name, ' ', p.last_name)
                as patient_name
            "),
                'p.gender',
                'p.date_of_birth',
                DB::raw('
                TIMESTAMPDIFF(
                    YEAR,
                    p.date_of_birth,
                    v.created_at
                ) as age
            '),
                'v.created_by as nurse_id',
                DB::raw('COALESCE(n.name, "Unassigned") as nurse_name'),
                'v.status',
            ])
            ->orderBy('v.created_at')
            ->get();

        return [
            'report' => 'patients-seen-department',

            'department_id' => $departmentId,

            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],

            'summary' => $summary,
            'by_day' => $byDay,
            'by_gender' => $byGender,
            'by_age_group' => $byAgeGroup,
            'by_nurse' => $byNurse,
            'details' => $details,
        ];
    }


    /* ------------------------------------------------------------------
     | 2. Patients Seen — Cash Paying
     |    Amounts collected per procedure, receipts, daily cash totals
     * ----------------------------------------------------------------*/



    public function patientsCashPaying($departmentId, Carbon $from, Carbon $to): array
    {
        // Base cash payment query
        $base = DB::table('payments as pay')
            ->join('invoices as i', 'i.id', '=', 'pay.invoice_id')
            ->join('patients as p', 'p.id', '=', 'i.patient_id')
            ->join('patient_visits as v', function ($join) {
                $join->on('v.token', '=', 'i.visit_token')
                    ->on('v.patient_id', '=', 'i.patient_id');
            })
            ->whereBetween('pay.payment_date', [
                $from->copy()->startOfDay(),
                $to->copy()->endOfDay()
            ])
            ->where('pay.payment_method', 'cash')
            ->where('pay.status', 'completed')
            ->where('i.deleted_at', null)
            ->when(
                $departmentId,
                fn($q) =>
                $q->where('v.department_id', $departmentId)
            );

        // Daily cash collections
        $dailyTotals = (clone $base)
            ->selectRaw('
            DATE(pay.payment_date) as date,
            COUNT(DISTINCT v.id) as visits,
            COUNT(DISTINCT pay.id) as receipts,
            SUM(pay.paid_amount) as total_cash
        ')
            ->groupByRaw('DATE(pay.payment_date)')
            ->orderBy('date')
            ->get();

        // Procedure breakdown from invoice JSON items
        $byProcedure = DB::table('invoices as i')
            ->join('patient_visits as v', function ($join) {
                $join->on('v.token', '=', 'i.visit_token')
                    ->on('v.patient_id', '=', 'i.patient_id');
            })
            ->crossJoin(DB::raw("
            JSON_TABLE(
                COALESCE(i.items, '[]'),
                '$[*]' COLUMNS (
                    service_id BIGINT PATH '$.service_id'
                        NULL ON EMPTY,
                    service_name VARCHAR(255) PATH '$.service_name'
                        NULL ON EMPTY,
                    service_category VARCHAR(100) PATH '$.service_category'
                        NULL ON EMPTY,
                    quantity DECIMAL(12,2) PATH '$.quantity'
                        NULL ON EMPTY,
                    amount DECIMAL(12,2) PATH '$.total'
                        NULL ON EMPTY
                )
            ) AS item
        "))
            ->whereBetween('i.issue_date', [
                $from->toDateString(),
                $to->toDateString()
            ])
            ->whereRaw('LOWER(item.service_category) = ?', ['procedures'])
            ->where('i.deleted_at', null)
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('payments as pay')
                    ->whereColumn('pay.invoice_id', 'i.id')
                    ->where('pay.payment_method', 'cash')
                    ->where('pay.status', 'completed');
            })
            ->when(
                $departmentId,
                fn($q) =>
                $q->where('v.department_id', $departmentId)
            )
            ->selectRaw('
            item.service_id as procedure_id,
            item.service_name as procedure_name,
            SUM(item.quantity) as quantity,
            COUNT(DISTINCT v.id) as visits,
            SUM(item.amount) as amount_invoiced
        ')
            ->groupBy('item.service_id', 'item.service_name')
            ->orderByDesc('amount_invoiced')
            ->get();

        // Detailed cash receipts
        $details = (clone $base)
            ->select([
                'v.id as visit_id',
                'v.created_at',
                'v.token',
                'p.patient_number',
                DB::raw("
                CONCAT(p.first_name, ' ', p.last_name)
                as patient_name
            "),
                'p.gender',
                'i.id as invoice_id',
                'i.invoice_number',
                'pay.id as payment_id',
                'pay.receipt_number',
                'pay.payment_number',
                'pay.paid_amount',
                'pay.payment_method',
                'pay.payment_date',
                'pay.status as payment_status',
                'i.total as invoice_total',
                'i.paid_amount as invoice_paid_amount',
            ])
            ->orderBy('pay.payment_date')
            ->get();

        // Unique visits across the entire reporting period
        $totalVisits = (clone $base)
            ->distinct()
            ->count('v.id');

        return [
            'report' => 'patients-cash',

            'department_id' => $departmentId,

            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],

            'summary' => [
                'total_cash' => $dailyTotals->sum('total_cash'),
                'total_visits' => $totalVisits,
                'total_receipts' => $dailyTotals->sum('receipts'),
            ],

            'daily_totals' => $dailyTotals,
            'by_procedure' => $byProcedure,
            'details' => $details,
        ];
    }



    /* ------------------------------------------------------------------
     | 3. Patients Seen — Insurance
     |    NHIMA / private medical aid, procedures claimed, claim refs
     * ----------------------------------------------------------------*/


    public function patientsInsurance($departmentId, Carbon $from, Carbon $to): array
    {
        $base = DB::table('payments as pay')
            ->join('invoices as i', 'i.id', '=', 'pay.invoice_id')
            ->join('patients as p', 'p.id', '=', 'i.patient_id')
            ->join('patient_visits as v', function ($join) {
                $join->on('v.token', '=', 'i.visit_token')
                    ->on('v.patient_id', '=', 'i.patient_id');
            })
            ->whereBetween('v.created_at', [
                $from->copy()->startOfDay(),
                $to->copy()->endOfDay()
            ])
            ->where('pay.payment_method', 'insurance')
            ->where('pay.status', 'completed')
            ->whereNull('i.deleted_at')
            ->when(
                $departmentId,
                fn($q) =>
                $q->where('v.department_id', $departmentId)
            );

        // By insurance payer / scheme
        $byPayer = (clone $base)
            ->selectRaw('
            COALESCE(i.payment_scheme, "Unknown Scheme") as payer,
            COUNT(DISTINCT v.id) as visits,
            COUNT(DISTINCT pay.id) as claims,
            SUM(pay.paid_amount) as total_claimed
        ')
            ->groupBy('i.payment_scheme')
            ->orderByDesc('total_claimed')
            ->get();

        // Procedure breakdown from invoice JSON
        $byProcedure = DB::table('invoices as i')
            ->join('payments as pay', 'pay.invoice_id', '=', 'i.id')
            ->join('patient_visits as v', function ($join) {
                $join->on('v.token', '=', 'i.visit_token')
                    ->on('v.patient_id', '=', 'i.patient_id');
            })
            ->crossJoin(DB::raw("
            JSON_TABLE(
                COALESCE(i.items, '[]'),
                '$[*]' COLUMNS (
                    service_id BIGINT PATH '$.service_id'
                        NULL ON EMPTY,
                    service_name VARCHAR(255) PATH '$.service_name'
                        NULL ON EMPTY,
                    service_category VARCHAR(100) PATH '$.service_category'
                        NULL ON EMPTY,
                    item_type VARCHAR(100) PATH '$.type'
                        NULL ON EMPTY,
                    quantity DECIMAL(12,2) PATH '$.quantity'
                        NULL ON EMPTY,
                    amount DECIMAL(12,2) PATH '$.total'
                        NULL ON EMPTY
                )
            ) AS item
        "))
            ->whereBetween('v.created_at', [
                $from->copy()->startOfDay(),
                $to->copy()->endOfDay()
            ])
            ->where('pay.payment_method', 'insurance')
            ->where('pay.status', 'completed')
            ->whereNull('i.deleted_at')
            ->where(function ($q) {
                $q->whereRaw(
                    'LOWER(item.service_category) = ?',
                    ['procedures']
                )->orWhereRaw(
                    'LOWER(item.item_type) = ?',
                    ['procedure']
                );
            })
            ->when(
                $departmentId,
                fn($q) =>
                $q->where('v.department_id', $departmentId)
            )
            ->selectRaw('
            item.service_id as procedure_id,
            item.service_name as procedure_name,
            SUM(item.quantity) as quantity,
            COUNT(DISTINCT v.id) as visits,
            SUM(item.amount) as amount_claimed
        ')
            ->groupBy('item.service_id', 'item.service_name')
            ->orderByDesc('amount_claimed')
            ->get();

        // Detailed insurance payments
        $details = (clone $base)
            ->select([
                'v.id as visit_id',
                'v.created_at',
                'p.patient_number',
                DB::raw("
                CONCAT(p.first_name, ' ', p.last_name)
                as patient_name
            "),
                'p.gender',
                'i.id as invoice_id',
                'i.invoice_number',
                'i.payment_scheme',
                'i.total as invoice_total',
                'i.paid_amount as invoice_paid_amount',
                'pay.id as payment_id',
                'pay.payment_number',
                'pay.receipt_number',
                'pay.paid_amount',
                'pay.total_amount',
                'pay.payment_date',
                'pay.status as payment_status',
            ])
            ->orderBy('v.created_at')
            ->get();

        // Count unique visits across the reporting period
        $totalVisits = (clone $base)
            ->distinct()
            ->count('v.id');

        return [
            'report' => 'patients-insurance',

            'department_id' => $departmentId,

            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],

            'summary' => [
                'total_claimed' => $byPayer->sum('total_claimed'),
                'total_visits' => $totalVisits,
                'total_claims' => $byPayer->sum('claims'),
            ],

            'by_payer' => $byPayer,
            'by_procedure' => $byProcedure,
            'details' => $details,
        ];
    }
}
