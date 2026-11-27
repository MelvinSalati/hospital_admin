<?php

namespace App\Http\Controllers\Dashboards;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MaternalchildhealthDashboardController extends Controller
{
    // Table names (adjust here if yours differ)
    private const T_PATIENTS     = 'patients';
    private const T_VISITS       = 'patient_visits';
    private const T_APPOINTMENTS = 'appointments';

    private const BREAKDOWN_DAYS = 90;

    // A pregnancy lasts ~40 weeks; clients with an ANC appointment in this window count as "active ANC"
    private const ACTIVE_ANC_DAYS = 280;

    private const URGENT_PRIORITIES = ['urgent', 'stat', 'emergency'];
    private const MISSED_STATUSES   = ['missed', 'no_show', 'no-show'];

    // Keyword groups used to recognise MCH appointments (matched against reason / notes)
    private const KW_ANC        = ['antenatal', 'prenatal', 'pregnan', 'anc visit', 'anc follow', 'anc first', 'anc booking'];
    private const KW_ANC_FIRST  = ['first visit', 'first anc', 'booking', 'initial'];
    private const KW_POSTNATAL  = ['postnatal', 'post-natal', 'postpartum', 'pnc'];
    private const KW_PNC_EARLY  = ['early', 'first', '48 hour', '6 day', '6 week'];
    private const KW_FP         = ['family planning', 'contracepti', 'implant', 'iud', 'depo'];
    private const KW_HIGH_RISK  = ['high risk', 'high-risk', 'eclampsia', 'haemorrhage', 'hemorrhage', 'obstructed'];

    private const CHART_COLORS = [
        '#2563eb',
        '#16a34a',
        '#d97706',
        '#9333ea',
    ];

    public function index(Request $request, int $departmentId): Response
    {
        $departmentId = (int) $departmentId;
        $today        = Carbon::today();

        return Inertia::render('martenal/dashboard', [
            'departmentId'       => $departmentId,
            'userName'           => $request->user()?->name ?? 'Maternal Child Health User',
            'stats'              => $this->dashboardStats($departmentId, $today),
            'visits'             => $this->todaysVisits($departmentId, $today),
            'alerts'             => $this->dashboardAlerts($departmentId, $today),
            'serviceData'        => $this->serviceBreakdown($today),
            'attendanceTrend'    => $this->attendanceTrend($departmentId, $today),
            'ancVisitData'       => $this->ancVisitBreakdown($today),
            'postnatalVisitData' => $this->postnatalVisitBreakdown($today),
            'breakdownDays'      => self::BREAKDOWN_DAYS,
        ]);
    }

    // -------------------------------------------------
    // Helpers
    // -------------------------------------------------

    /** Base appointments query (alias `a`), excluding soft-deleted rows. */
    private function appointments(): Builder
    {
        return DB::table(self::T_APPOINTMENTS . ' as a')->whereNull('a.deleted_at');
    }

    /** Appointment reason/notes contains ANY of the keywords. */
    private function matchesAny(Builder $query, array $keywords): Builder
    {
        return $query->where(function ($q) use ($keywords) {
            foreach ($keywords as $kw) {
                $q->orWhere('a.reason', 'like', "%{$kw}%")
                    ->orWhere('a.notes', 'like', "%{$kw}%");
            }
        });
    }

    /** Appointment reason/notes contains NONE of the keywords. */
    private function matchesNone(Builder $query, array $keywords): Builder
    {
        foreach ($keywords as $kw) {
            $query->whereRaw("COALESCE(a.reason, '') NOT LIKE ?", ["%{$kw}%"])
                ->whereRaw("COALESCE(a.notes, '') NOT LIKE ?", ["%{$kw}%"]);
        }

        return $query;
    }

    /** Any MCH-looking appointment: in this department OR matching any MCH keyword. */
    private function mchAppointmentScope(Builder $query, int $departmentId): Builder
    {
        $all = array_merge(self::KW_ANC, self::KW_POSTNATAL, self::KW_FP);

        return $query->where(function ($q) use ($departmentId, $all) {
            $q->where('a.department', (string) $departmentId);

            foreach ($all as $kw) {
                $q->orWhere('a.reason', 'like', "%{$kw}%")
                    ->orWhere('a.notes', 'like', "%{$kw}%");
            }
        });
    }

    private function ancFirstCondition(Builder $query): Builder
    {
        return $this->matchesAny($this->matchesAny($query, self::KW_ANC), self::KW_ANC_FIRST);
    }

    private function ancFollowUpCondition(Builder $query): Builder
    {
        return $this->matchesNone($this->matchesAny($query, self::KW_ANC), self::KW_ANC_FIRST);
    }

    private function inWindow(Builder $query, Carbon $today): Builder
    {
        return $query->whereBetween('a.appointment_date', [
            $today->copy()->subDays(self::BREAKDOWN_DAYS)->toDateString(),
            $today->toDateString(),
        ]);
    }

    private function classifyService(?string $text): string
    {
        $text = strtolower((string) $text);

        $has = fn(array $kws) => collect($kws)->contains(fn($k) => str_contains($text, $k));

        return match (true) {
            $has(self::KW_POSTNATAL)                                => 'Postnatal Care',
            $has(self::KW_FP)                                       => 'Family Planning',
            $has(self::KW_ANC) && $has(self::KW_ANC_FIRST)          => 'ANC First Visit',
            $has(self::KW_ANC)                                      => 'ANC Follow-up',
            default                                                 => 'MCH Consultation',
        };
    }

    // -------------------------------------------------
    // 1. Stats
    // -------------------------------------------------
    private function dashboardStats(int $departmentId, Carbon $today): array
    {
        $registeredMothers = DB::table(self::T_PATIENTS . ' as p')
            ->whereIn('p.id', function ($sub) use ($departmentId) {
                $sub->select('patient_id')
                    ->from(self::T_VISITS)
                    ->whereNotNull('patient_id');
            })
            ->count();

        $visitsToday = DB::table(self::T_VISITS)
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->count();

        // Distinct clients with a live ANC appointment inside the pregnancy window
        $activeAnc = $this->matchesAny($this->appointments(), self::KW_ANC)
            ->whereNotNull('a.patient_id')
            ->whereNotIn('a.status', ['cancelled', ...self::MISSED_STATUSES])
            ->where('a.appointment_date', '>=', $today->copy()->subDays(self::ACTIVE_ANC_DAYS)->toDateString())
            ->distinct()
            ->count('a.patient_id');

        // High-risk: urgent/emergency department visits (last 90 days) + high-risk flagged appointments
        $urgentVisitPatients = DB::table(self::T_VISITS)
            ->where('department_id', $departmentId)
            ->whereIn('priority', self::URGENT_PRIORITIES)
            ->where('created_at', '>=', $today->copy()->subDays(self::BREAKDOWN_DAYS))
            ->whereNotNull('patient_id')
            ->pluck('patient_id');

        $flaggedPatients = $this->matchesAny($this->appointments(), self::KW_HIGH_RISK)
            ->whereNotNull('a.patient_id')
            ->where('a.appointment_date', '>=', $today->copy()->subDays(self::ACTIVE_ANC_DAYS)->toDateString())
            ->pluck('a.patient_id');

        $highRisk = $urgentVisitPatients->merge($flaggedPatients)->unique()->count();

        return [
            'registeredMothers'   => $registeredMothers,
            'visitsToday'         => $visitsToday,
            'activeANC'           => $activeAnc,
            'highRiskPregnancies' => $highRisk,
        ];
    }

    // -------------------------------------------------
    // 2. Today's MCH visits (queue)
    // -------------------------------------------------
    private function todaysVisits(int $departmentId, Carbon $today): array
    {
        $rows = DB::table(self::T_VISITS . ' as v')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'v.patient_id')
            ->where('v.department_id', $departmentId)
            ->whereDate('v.created_at', $today)
            ->orderByDesc('v.created_at')
            ->select([
                'v.id',
                'v.patient_id',
                'v.status',
                'v.created_at',
                'v.updated_at',
                'p.first_name',
                'p.last_name',
                'p.patient_number',
            ])
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        // One query for today's appointments of these patients (avoids N+1)
        $appointments = $this->appointments()
            ->whereIn('a.patient_id', $rows->pluck('patient_id')->filter()->unique()->all())
            ->whereDate('a.appointment_date', $today)
            ->select('a.patient_id', 'a.reason', 'a.notes')
            ->get()
            ->keyBy('patient_id');

        return $rows->map(function ($visit) use ($appointments) {
            $isFinished = (int) $visit->status === 0;

            $endTime = $isFinished && $visit->updated_at
                ? Carbon::parse($visit->updated_at)
                : now();

            $minutes = $visit->created_at
                ? (int) abs(Carbon::parse($visit->created_at)->diffInMinutes($endTime))
                : 0;

            $status = match (true) {
                $isFinished                 => 'completed',
                (int) $visit->status === 2  => 'in-progress',
                default                     => 'waiting',
            };

            $appt = $appointments->get($visit->patient_id);

            return [
                'id'             => $visit->id,
                'patientCode'    => $visit->patient_number ?? 'N/A',
                'name'           => trim(($visit->first_name ?? '') . ' ' . ($visit->last_name ?? '')),
                'service'        => $appt
                    ? $this->classifyService(($appt->reason ?? '') . ' ' . ($appt->notes ?? ''))
                    : 'MCH Consultation',
                'waitingMinutes' => $minutes,
                'status'         => $status,
            ];
        })->values()->toArray();
    }

    // -------------------------------------------------
    // 3. Service breakdown (last 90 days)
    // -------------------------------------------------
    private function serviceBreakdown(Carbon $today): array
    {
        $services = [
            'ANC First Visit' => fn(Builder $q) => $this->ancFirstCondition($q),
            'ANC Follow-up'   => fn(Builder $q) => $this->ancFollowUpCondition($q),
            'Postnatal Care'  => fn(Builder $q) => $this->matchesAny($q, self::KW_POSTNATAL),
            'Family Planning' => fn(Builder $q) => $this->matchesAny($q, self::KW_FP),
        ];

        $data  = [];
        $index = 0;

        foreach ($services as $label => $apply) {
            $query = $this->inWindow($this->appointments(), $today)
                ->where('a.status', '!=', 'cancelled');

            $data[] = [
                'label' => $label,
                'value' => (int) $apply($query)->count(),
                'color' => self::CHART_COLORS[$index++ % count(self::CHART_COLORS)],
            ];
        }

        return $data;
    }

    // -------------------------------------------------
    // 4. Attendance trend (last 6 months)
    // -------------------------------------------------
    private function attendanceTrend(int $departmentId, Carbon $today): array
    {
        $firstMonth = $today->copy()->startOfMonth()->subMonths(5);

        $raw = DB::table(self::T_VISITS)
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month_key"),
                DB::raw('COUNT(*) as visits')
            )
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', $firstMonth)
            ->groupBy('month_key')
            ->get()
            ->keyBy('month_key');

        $trend = [];

        for ($i = 5; $i >= 0; $i--) {
            $date = $today->copy()->startOfMonth()->subMonths($i);

            $trend[] = [
                'month'  => $date->format('M'),
                'visits' => (int) ($raw[$date->format('Y-m')]->visits ?? 0),
            ];
        }

        return $trend;
    }

    // -------------------------------------------------
    // 5. Alerts / notifications
    // -------------------------------------------------
    private function dashboardAlerts(int $departmentId, Carbon $today): array
    {
        $alerts = [];

        // High-priority visits in the department (last 7 days)
        $urgent = DB::table(self::T_VISITS . ' as v')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'v.patient_id')
            ->where('v.department_id', $departmentId)
            ->whereIn('v.priority', self::URGENT_PRIORITIES)
            ->where('v.status', '!=', 0)
            ->where('v.created_at', '>=', $today->copy()->subDays(7))
            ->orderByDesc('v.created_at')
            ->limit(5)
            ->select('v.id', 'v.priority', 'v.created_at', 'p.patient_number')
            ->get();

        foreach ($urgent as $v) {
            $alerts[] = [
                'id'          => $v->id,
                'title'       => 'High-risk pregnancy',
                'description' => ($v->patient_number ?? 'Patient') . ' · Requires clinical review',
                'category'    => 'danger',
                'time'        => Carbon::parse($v->created_at)->diffForHumans(),
            ];
        }

        // Missed MCH appointments (last 14 days)
        $missed = $this->mchAppointmentScope(
            $this->appointments()->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'a.patient_id'),
            $departmentId
        )
            ->whereIn('a.status', self::MISSED_STATUSES)
            ->whereBetween('a.appointment_date', [
                $today->copy()->subDays(14)->toDateString(),
                $today->toDateString(),
            ])
            ->orderByDesc('a.appointment_date')
            ->limit(5)
            ->select('a.id', 'a.reason', 'a.appointment_date', 'a.appointment_time', 'p.patient_number')
            ->get();

        foreach ($missed as $m) {
            $alerts[] = [
                'id'          => 1000000 + $m->id,
                'title'       => 'Missed appointment',
                'description' => ($m->patient_number ?? 'Patient') . ' · ' . ($m->reason ?: 'Follow-up required'),
                'category'    => 'warning',
                'time'        => Carbon::parse($m->appointment_date . ' ' . ($m->appointment_time ?? '00:00'))->diffForHumans(),
            ];
        }

        // Upcoming MCH appointments (next 7 days)
        $upcoming = $this->mchAppointmentScope(
            $this->appointments()->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'a.patient_id'),
            $departmentId
        )
            ->whereIn('a.status', ['pending', 'confirmed', 'upcoming'])
            ->whereBetween('a.appointment_date', [
                $today->toDateString(),
                $today->copy()->addDays(7)->toDateString(),
            ])
            ->orderBy('a.appointment_date')
            ->orderBy('a.appointment_time')
            ->limit(5)
            ->select('a.id', 'a.reason', 'a.appointment_date', 'a.appointment_time', 'p.patient_number')
            ->get();

        foreach ($upcoming as $u) {
            $alerts[] = [
                'id'          => 2000000 + $u->id,
                'title'       => 'Upcoming appointment due',
                'description' => ($u->patient_number ?? 'Patient') . ' · ' . ($u->reason ?: 'MCH consultation'),
                'category'    => 'info',
                'time'        => Carbon::parse($u->appointment_date . ' ' . ($u->appointment_time ?? '00:00'))->diffForHumans(),
            ];
        }

        // Consultations completed in the last 24 hours
        $completed = DB::table(self::T_VISITS . ' as v')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'v.patient_id')
            ->where('v.department_id', $departmentId)
            ->where('v.status', 0)
            ->where('v.updated_at', '>=', now()->subHours(24))
            ->orderByDesc('v.updated_at')
            ->limit(3)
            ->select('v.id', 'v.updated_at', 'p.patient_number')
            ->get();

        foreach ($completed as $c) {
            $alerts[] = [
                'id'          => 3000000 + $c->id,
                'title'       => 'MCH consultation completed',
                'description' => ($c->patient_number ?? 'Patient') . ' · Consultation recorded',
                'category'    => 'success',
                'time'        => Carbon::parse($c->updated_at)->diffForHumans(),
            ];
        }

        return collect($alerts)->take(10)->values()->toArray();
    }

    // -------------------------------------------------
    // 6. ANC visit summary (first / follow-up / missed)
    // -------------------------------------------------
    private function ancVisitBreakdown(Carbon $today): array
    {
        $base = fn() => $this->inWindow($this->appointments(), $today);

        $first = $this->ancFirstCondition($base())
            ->whereNotIn('a.status', ['cancelled', ...self::MISSED_STATUSES])->count();

        $follow = $this->ancFollowUpCondition($base())
            ->whereNotIn('a.status', ['cancelled', ...self::MISSED_STATUSES])->count();

        $missed = $this->matchesAny($base(), self::KW_ANC)
            ->whereIn('a.status', self::MISSED_STATUSES)->count();

        return [
            ['label' => 'First visit', 'value' => $first,  'color' => '#2563eb'],
            ['label' => 'Follow-up',   'value' => $follow, 'color' => '#0d9488'],
            ['label' => 'Missed',      'value' => $missed, 'color' => '#f59e0b'],
        ];
    }

    // -------------------------------------------------
    // 7. Postnatal visit summary (early / follow-up / overdue)
    // -------------------------------------------------
    private function postnatalVisitBreakdown(Carbon $today): array
    {
        $base = fn() => $this->matchesAny($this->inWindow($this->appointments(), $today), self::KW_POSTNATAL);

        $attended = fn(Builder $q) => $q->whereNotIn('a.status', ['cancelled', ...self::MISSED_STATUSES]);

        $early = $attended($this->matchesAny($base(), self::KW_PNC_EARLY))->count();

        $follow = $attended($this->matchesNone($base(), self::KW_PNC_EARLY))->count();

        $overdue = $base()->whereIn('a.status', self::MISSED_STATUSES)->count();

        return [
            ['label' => 'Early PNC', 'value' => $early,   'color' => '#2563eb'],
            ['label' => 'Follow-up', 'value' => $follow,  'color' => '#0d9488'],
            ['label' => 'Overdue',   'value' => $overdue, 'color' => '#f59e0b'],
        ];
    }
}
