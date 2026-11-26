<?php

namespace App\Http\Controllers\Dashboards;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OpthamologyDashboardController extends Controller
{
    // Table names (adjust here if yours differ)
    private const T_PATIENTS     = 'patients';
    private const T_VISITS       = 'patient_visits';
    private const T_ORDER_ITEMS  = 'opthamology_order_items';
    private const T_APPOINTMENTS = 'appointments';

    /**
     * Ophthalmology Department Dashboard
     */
    public function index(Request $request, int $departmentId = 9): Response
    {
        $departmentId = (int) $departmentId;
        $today        = Carbon::today();
        $sixMonthsAgo = $today->copy()->subMonths(5)->startOfMonth();

        $urgentPriorities = ['urgent', 'stat', 'emergency'];

        // -------------------------------------------------
        // 1. Stats
        // -------------------------------------------------
        $registeredPatients = DB::table(self::T_PATIENTS)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->count();

        $visitsToday = DB::table(self::T_VISITS)
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->count();

        $activeTreatments = DB::table(self::T_ORDER_ITEMS)
            ->where('status', 'pending')
            ->count();

        $urgentOrderCount = DB::table(self::T_ORDER_ITEMS)
            ->whereIn('priority', $urgentPriorities)
            ->where('status', 'pending')
            ->count();

        $emergencyApptCount = DB::table(self::T_APPOINTMENTS)
            ->where('priority', 'emergency')
            ->whereIn('status', ['pending', 'confirmed', 'checked_in'])
            ->whereDate('appointment_date', '>=', $today)
            ->count();

        $stats = [
            'registeredPatients' => $registeredPatients,
            'visitsToday'        => $visitsToday,
            'activeTreatments'   => $activeTreatments,
            'urgentReferrals'    => $urgentOrderCount + $emergencyApptCount,
        ];

        // -------------------------------------------------
        // 2. Today's Ophthalmology Visits (queue)
        // -------------------------------------------------
        $visitRows = DB::table(self::T_VISITS . ' as v')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'v.patient_id')
            ->where('v.department_id', $departmentId)
            ->whereDate('v.created_at', $today)
            ->orderByDesc('v.created_at')
            ->select([
                'v.id',
                'v.token',
                'v.patient_id',
                'v.status',
                'v.created_at',
                'p.first_name',
                'p.last_name',
                'p.patient_number',
            ])
            ->get();

        // Fetch all possibly-related orders once (avoids N+1), newest first
        $orderRows = collect();
        if ($visitRows->isNotEmpty()) {
            $tokens     = $visitRows->pluck('token')->filter()->unique()->values()->all();
            $patientIds = $visitRows->pluck('patient_id')->filter()->unique()->values()->all();

            $orderRows = DB::table(self::T_ORDER_ITEMS)
                ->where(function ($q) use ($tokens, $patientIds) {
                    if (!empty($tokens)) {
                        $q->whereIn('visit_token', $tokens);
                    }
                    if (!empty($patientIds)) {
                        $q->orWhereIn('patient_id', $patientIds);
                    }
                })
                ->orderByDesc('ordered_at')
                ->get();
        }

        $todaysVisits = $visitRows
            ->map(function ($visit) use ($orderRows) {
                $minutesWaiting = $visit->created_at
                    ? (int) abs(Carbon::parse($visit->created_at)->diffInMinutes(now()))
                    : 0;

                // Latest order matching this visit's token OR patient
                $order = $orderRows->first(function ($o) use ($visit) {
                    return ($visit->token && $o->visit_token === $visit->token)
                        || ($visit->patient_id && $o->patient_id == $visit->patient_id);
                });

                $status = match ((int) $visit->status) {
                    0       => 'completed',
                    1       => 'in-progress',
                    default => 'waiting',
                };

                if ($order) {
                    $status = match ($order->status) {
                        'completed' => 'completed',
                        'pending'   => $minutesWaiting > 30 ? 'waiting' : 'in-progress',
                        default     => 'waiting',
                    };
                }

                return [
                    'id'             => $visit->id,
                    'patientCode'    => $visit->patient_number ?? 'N/A',
                    'name'           => trim(($visit->first_name ?? '') . ' ' . ($visit->last_name ?? '')),
                    'service'        => $order->service_name ?? 'Eye Consultation',
                    'waitingMinutes' => $minutesWaiting,
                    'status'         => $status,
                ];
            })
            ->values()
            ->toArray();

        // -------------------------------------------------
        // 3. Service Breakdown (last 30 days)
        // -------------------------------------------------
        $colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0d9488', '#dc2626', '#0891b2', '#7c3aed'];

        $serviceBreakdown = DB::table(self::T_ORDER_ITEMS)
            ->select('service_name', DB::raw('COUNT(*) as total'))
            ->where('ordered_at', '>=', $today->copy()->subDays(30))
            ->groupBy('service_name')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->values()
            ->map(function ($row, $index) use ($colors) {
                return [
                    'label' => $row->service_name,
                    'value' => (int) $row->total,
                    'color' => $colors[$index % count($colors)],
                ];
            })
            ->toArray();

        if (empty($serviceBreakdown)) {
            $serviceBreakdown = [
                ['label' => 'Eye Consultation',   'value' => 0, 'color' => '#2563eb'],
                ['label' => 'Visual Acuity Test', 'value' => 0, 'color' => '#16a34a'],
                ['label' => 'Fundoscopy',         'value' => 0, 'color' => '#d97706'],
                ['label' => 'Refraction Test',    'value' => 0, 'color' => '#9333ea'],
            ];
        }

        // -------------------------------------------------
        // 4. Attendance Trend (last 6 months)
        // -------------------------------------------------
        $trendRaw = DB::table(self::T_VISITS)
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month_key"),
                DB::raw('COUNT(*) as visits')
            )
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', $sixMonthsAgo)
            ->groupBy('month_key')
            ->orderBy('month_key')
            ->get()
            ->keyBy('month_key');

        $attendanceTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = $today->copy()->subMonths($i);
            $key  = $date->format('Y-m');

            $attendanceTrend[] = [
                'month'  => $date->format('M'),
                'visits' => (int) ($trendRaw[$key]->visits ?? 0),
            ];
        }

        // -------------------------------------------------
        // 5. Alerts / Notifications
        // -------------------------------------------------
        $alerts = [];

        // Urgent pending orders
        $urgentOrders = DB::table(self::T_ORDER_ITEMS . ' as o')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'o.patient_id')
            ->whereIn('o.priority', $urgentPriorities)
            ->where('o.status', 'pending')
            ->orderByDesc('o.ordered_at')
            ->limit(5)
            ->select('o.id', 'o.service_name', 'o.ordered_at', 'p.patient_number')
            ->get();

        foreach ($urgentOrders as $order) {
            $alerts[] = [
                'id'          => $order->id,
                'title'       => 'Urgent ophthalmology order',
                'description' => ($order->patient_number ?? 'Patient') . ' · ' . $order->service_name,
                'category'    => 'danger',
                'time'        => $order->ordered_at
                    ? Carbon::parse($order->ordered_at)->diffForHumans()
                    : 'Recently',
            ];
        }

        // Upcoming appointments (next 7 days)
        $upcomingAppts = DB::table(self::T_APPOINTMENTS . ' as a')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'a.patient_id')
            ->whereIn('a.status', ['pending', 'confirmed'])
            ->whereBetween('a.appointment_date', [$today, $today->copy()->addDays(7)])
            ->where(function ($q) use ($departmentId) {
                $q->where('a.department', (string) $departmentId)
                    ->orWhere('a.reason', 'like', '%eye%')
                    ->orWhere('a.reason', 'like', '%ophthal%')
                    ->orWhere('a.reason', 'like', '%cataract%')
                    ->orWhere('a.reason', 'like', '%glaucoma%');
            })
            ->orderBy('a.appointment_date')
            ->limit(5)
            ->select('a.id', 'a.reason', 'a.appointment_date', 'p.patient_number')
            ->get();

        foreach ($upcomingAppts as $appt) {
            $alerts[] = [
                'id'          => 1000 + $appt->id,
                'title'       => 'Upcoming ophthalmology appointment',
                'description' => ($appt->patient_number ?? 'Patient') . ' · ' . ($appt->reason ?? 'Eye consultation'),
                'category'    => 'warning',
                'time'        => Carbon::parse($appt->appointment_date)->diffForHumans(),
            ];
        }

        // Recently completed
        $recentCompleted = DB::table(self::T_ORDER_ITEMS . ' as o')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'o.patient_id')
            ->where('o.status', 'completed')
            ->where('o.updated_at', '>=', $today->copy()->subHours(6))
            ->orderByDesc('o.updated_at')
            ->limit(3)
            ->select('o.id', 'o.service_name', 'o.updated_at', 'p.patient_number')
            ->get();

        foreach ($recentCompleted as $item) {
            $alerts[] = [
                'id'          => 2000 + $item->id,
                'title'       => 'Eye examination completed',
                'description' => ($item->patient_number ?? 'Patient') . ' · ' . $item->service_name,
                'category'    => 'success',
                'time'        => $item->updated_at
                    ? Carbon::parse($item->updated_at)->diffForHumans()
                    : 'Recently',
            ];
        }

        $alerts = collect($alerts)->take(10)->values()->toArray();

        // -------------------------------------------------
        // 6. Visual Acuity & Outcomes (static until clinical tables exist)
        // -------------------------------------------------
        $visualAcuityData = [
            ['label' => 'Normal vision',       'value' => 48, 'color' => '#2563eb'],
            ['label' => 'Mild impairment',     'value' => 26, 'color' => '#0d9488'],
            ['label' => 'Moderate impairment', 'value' => 14, 'color' => '#f59e0b'],
            ['label' => 'Severe impairment',   'value' => 7,  'color' => '#ea580c'],
            ['label' => 'Blindness',           'value' => 3,  'color' => '#dc2626'],
        ];

        $outcomeData = [
            ['label' => 'Routine review',      'value' => 54, 'color' => '#2563eb'],
            ['label' => 'Treatment started',   'value' => 28, 'color' => '#0d9488'],
            ['label' => 'Specialist referral', 'value' => 12, 'color' => '#f59e0b'],
            ['label' => 'Follow-up required',  'value' => 18, 'color' => '#9333ea'],
        ];

        // -------------------------------------------------
        // Return to Inertia
        // -------------------------------------------------
        return Inertia::render('opthamology/dashboard', [
            'userName'         => $request->user()?->name ?? 'Ophthalmology User',
            'stats'            => $stats,
            'visits'           => $todaysVisits,
            'alerts'           => $alerts,
            'serviceData'      => $serviceBreakdown,
            'attendanceTrend'  => $attendanceTrend,
            'visualAcuityData' => $visualAcuityData,
            'outcomeData'      => $outcomeData,
        ]);
    }
}
