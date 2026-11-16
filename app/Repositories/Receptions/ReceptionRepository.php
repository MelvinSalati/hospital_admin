<?php

namespace App\Repositories\Receptions;

use App\Models\Dashboards\Alert;
use App\Models\Patients\Interaction;
use App\Models\Patients\Patient;
use Illuminate\Support\Facades\DB;
use App\Models\PatientVisit;
use Carbon\Carbon;

class ReceptionRepository
{
    public function dashboard()
    {
        return $this->mapDashboardMetrics();
    }

    public function mapDashboardMetrics(): array
    {
        $today = Carbon::today();

        return [
            'interactionsToday' => Interaction::whereDate('created_at', $today)->count(),
            'visitsToday'       => PatientVisit::whereDate('created_at', $today)->count(),
            'registeredPatients' => Patient::count()
        ];
    }

    public function getActiveQueue(): mixed
    {
        $activevisit = PatientVisit::with(['patient', 'department'])
            ->whereDate('created_at', Carbon::today())
            ->latest()
            ->get();

        return $activevisit->map(function ($patient) {
            return [
                'id'           => $patient->id,
                'name'         => $patient->patient->first_name . " " . $patient->patient->last_name,
                'token'        => $patient->token,
                'service_name' => $patient->department->name ?? 'N/A',
                'waiting_time' => (int) Carbon::parse($patient->created_at)->diffInMinutes(Carbon::now()),
                'status'       => $patient->status == 1? 'In queue' : 'Out of Queue',
            ];
        })->values()->all();
    }

    public function receptionAlerts(int $departmentId): array
    {
        $receptionAlerts = Alert::where('department_id', $departmentId)->get();

        return $receptionAlerts->map(function ($alert) {
            return [
                'id'          => $alert->id,
                'title'       => $alert->title,
                'description' => $alert->description,
                'category'    => $alert->category,
                'time'        => $alert->time,
            ];
        })->values()->all();
    }

    public function serviceData(): array
    {
        $palette = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#dc2626'];

        return PatientVisit::with('department')
            ->whereDate('created_at', Carbon::today())
            ->get()
            ->groupBy(fn($visit) => $visit->department->name ?? 'N/A')
            ->map(fn($group) => $group->count())
            ->sortDesc()
            ->take(6)
            ->map(fn($count, $label) => ['label' => $label, 'value' => $count])
            ->values()
            ->map(fn($row, $i) => $row + ['color' => $palette[$i % count($palette)]])
            ->all();
    }

    public function attendanceTrend(): array
    {
        $attendanceTrends = DB::table('patient_visits')
            ->select(
                DB::raw("DATE_FORMAT(created_at,'%b') AS month"),
                DB::raw("count(*) AS visits")
            )
            ->where('created_at', '>=', Carbon::now()->startOfMonth()->subMonths(5))
            ->groupBy(DB::raw("DATE_FORMAT(created_at,'%b')"))
            ->orderBy(DB::raw("MIN(created_at)"))
            ->get();

        return $attendanceTrends
            ->map(fn($row) => ['month' => $row->month, 'visits' => (int) $row->visits])
            ->all();
    }

    public function patientFlow(): array
    {
        $todayVisits = PatientVisit::whereDate('created_at', Carbon::today());

        $checkedIn = (clone $todayVisits)->count();
        $inQueue   = (clone $todayVisits)->where('status', 1)->count();
        $seen      = $checkedIn - $inQueue;

        return [
            'seenToday' => $seen,
            'inQueue'   => $inQueue,
            'checkedIn' => $checkedIn,
            'completed' => $seen,
        ];
    }

    public function paymentStats(): array
    {
        $methods = ['cash' => 0.0, 'card' => 0.0, 'mobile' => 0.0, 'insurance' => 0.0];

        foreach ($this->paymentStatsByMethod() as $row) {
            $key = strtolower((string) $row->payment_method);

            if (array_key_exists($key, $methods)) {
                $methods[$key] += (float) $row->total_paid_sum - (float) $row->total_change_sum;
            }
        }

        $pending = $this->pendingBillsToday();

        return [
            'pendingBillsToday'  => (int) ($pending->pending_count ?? 0),
            'pendingAmountToday' => (float) ($pending->pending_amount ?? 0),
            'collectedToday'     => array_sum($methods),
            'byMethod'           => $methods,
        ];
    }

    private function paymentStatsByMethod()
    {
        return DB::table('payments')
            ->select(
                'payment_method',
                DB::raw("
                COUNT(*) AS total_payments,
                SUM(total_amount) AS total_amount_sum,
                SUM(paid_amount) AS total_paid_sum,
                SUM(change_amount) AS total_change_sum,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count,
                COUNT(CASE WHEN status != 'completed' THEN 1 END) AS incomplete_count
            ")
            )
            ->whereDate('created_at', DB::raw('CURDATE()')) // only today's payments
            ->groupBy('payment_method')
            ->orderBy('payment_method')
            ->get();
    }

    private function pendingBillsToday()
    {
        return DB::table('invoices')
            ->select(
                DB::raw("
                COUNT(*) AS pending_count,
                SUM(due_amount) AS pending_amount
            ")
            )
            ->whereDate('issue_date', DB::raw('CURDATE()')) // only today's invoices
            ->where('status', '!=', 'paid') // exclude fully paid invoices
            ->first();
    }

    private function pendingAmountToday()
    {
        return DB::table('invoices')
            ->whereDate('issue_date', DB::raw('CURDATE()')) // filter today's invoices
            ->where('status', '!=', 'paid') // exclude fully paid invoices
            ->sum('due_amount'); // sum only the due_amount column
    }
}
