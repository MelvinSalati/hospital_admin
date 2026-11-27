<?php

namespace App\Http\Controllers\Dashboards;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

/**
 * Theatre dashboard.
 *
 * Data sources (easy_billing):
 *  - patient_visits : department_id = theatre department. status 1 = in queue, 0 = moved on.
 *  - patients       : first_name, last_name.
 *  - services       : department_id = theatre department (procedures + anaesthesia).
 *  - theater_order_items (optional): needs `service_id` and `created_at`. If the table or
 *    columns are missing, the procedure and anaesthesia charts are simply empty.
 */
class TheatreDashboardController extends Controller
{
    private const ORDER_TABLE = 'theater_order_items';

    private const STATUS_OPEN = 1;
    private const STATUS_CLOSED = 0;

    /** Waiting longer than this (minutes) raises a "long wait" alert. */
    private const LONG_WAIT_MINUTES = 60;

    private const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0d9488', '#dc2626'];

    public function index(Request $request, int $departmentId)
    {
        // Optional: guard against users hitting another department's dashboard.
        // $this->authorize('viewTheatreDashboard', $departmentId);

        $orderCounts = $this->theatreServiceCounts($departmentId);

        return Inertia::render('theatre/dashboard', [
            'userName'        => $request->user()?->name ?? 'Theatre User',
            'stats'           => $this->stats($departmentId),
            'cases'           => $this->cases($departmentId),
            'alerts'          => $this->alerts($departmentId),
            'procedureData'   => $this->procedureData($orderCounts),
            'procedureTrend'  => $this->procedureTrend($departmentId),
            'urgencyData'     => $this->urgencyData($departmentId),
            'anaesthesiaData' => $this->anaesthesiaData($orderCounts),
        ]);
    }

    // ─── Base query ──────────────────────────────────────────

    private function visits(int $departmentId)
    {
        return DB::table('patient_visits')->where('department_id', $departmentId);
    }

    // ─── Stats ───────────────────────────────────────────────

    private function stats(int $departmentId): array
    {
        $start = Carbon::today();
        $end   = Carbon::tomorrow();

        return [
            'scheduledToday' => $this->visits($departmentId)
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->count(),

            'completedToday' => $this->visits($departmentId)
                ->where('status', self::STATUS_CLOSED)
                ->where('updated_at', '>=', $start)
                ->where('updated_at', '<', $end)
                ->count(),

            'inTheatre' => $this->visits($departmentId)
                ->where('status', self::STATUS_OPEN)
                ->count(),

            'emergencyCases' => $this->visits($departmentId)
                ->where('priority', 'emergency')
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->count(),
        ];
    }

    // ─── Today's theatre queue ───────────────────────────────

    private function cases(int $departmentId): array
    {
        $start = Carbon::today();
        $end   = Carbon::tomorrow();

        $rows = DB::table('patient_visits as v')
            ->leftJoin('patients as p', 'p.id', '=', 'v.patient_id')
            ->where('v.department_id', $departmentId)
            ->where(function ($q) use ($start, $end) {
                $q->where('v.status', self::STATUS_OPEN)
                    ->orWhere(function ($q2) use ($start, $end) {
                        $q2->where('v.created_at', '>=', $start)->where('v.created_at', '<', $end);
                    })
                    ->orWhere(function ($q2) use ($start, $end) {
                        $q2->where('v.updated_at', '>=', $start)->where('v.updated_at', '<', $end);
                    });
            })
            ->orderByDesc('v.status')
            ->orderByRaw("FIELD(v.priority, 'emergency', 'urgent', 'routine')")
            ->orderBy('v.created_at')
            ->limit(50)
            ->get([
                'v.id',
                'v.token',
                'v.visit_type',
                'v.priority',
                'v.status',
                'v.created_at',
                'v.updated_at',
                'p.first_name',
                'p.last_name',
            ]);

        return $rows->map(function ($r) {
            $arrived = Carbon::parse($r->created_at);
            $isOpen  = (int) $r->status === self::STATUS_OPEN;
            $until   = $isOpen ? now() : Carbon::parse($r->updated_at);

            return [
                'id'          => (int) $r->id,
                'patientCode' => $r->token ?: 'THE-' . $r->id,
                'name'        => $this->patientName($r),
                'visitType'   => $r->visit_type,
                'priority'    => $r->priority,
                'arrivedAt'   => $arrived->format('H:i'),
                'minutes'     => max(0, (int) abs($arrived->diffInMinutes($until))),
                'status'      => $isOpen ? 'waiting' : 'completed',
            ];
        })->values()->all();
    }

    // ─── Alerts (derived from the live queue) ────────────────

    private function alerts(int $departmentId): array
    {
        $alerts = collect();
        $n = 0;

        $open = DB::table('patient_visits as v')
            ->leftJoin('patients as p', 'p.id', '=', 'v.patient_id')
            ->where('v.department_id', $departmentId)
            ->where('v.status', self::STATUS_OPEN)
            ->orderBy('v.created_at')
            ->limit(50)
            ->get(['v.id', 'v.token', 'v.priority', 'v.created_at', 'p.first_name', 'p.last_name']);

        foreach ($open as $r) {
            $arrived = Carbon::parse($r->created_at);
            $waited  = max(0, (int) abs($arrived->diffInMinutes(now())));
            $label   = ($r->token ?: 'THE-' . $r->id) . ' · ' . $this->patientName($r);

            if ($r->priority === 'emergency') {
                $title = 'Emergency patient waiting';
                $category = 'danger';
            } elseif ($r->priority === 'urgent') {
                $title = 'Urgent patient waiting';
                $category = 'warning';
            } elseif ($waited >= self::LONG_WAIT_MINUTES) {
                $title = 'Long wait in queue';
                $category = 'warning';
            } else {
                continue;
            }

            $alerts->push([
                'id'          => ++$n,
                'title'       => $title,
                'description' => "{$label}, waiting {$waited} min",
                'category'    => $category,
                'createdAt'   => $arrived->toIso8601String(),
            ]);
        }

        $recentlyDone = DB::table('patient_visits as v')
            ->leftJoin('patients as p', 'p.id', '=', 'v.patient_id')
            ->where('v.department_id', $departmentId)
            ->where('v.status', self::STATUS_CLOSED)
            ->where('v.updated_at', '>=', Carbon::now()->subHours(2))
            ->orderByDesc('v.updated_at')
            ->limit(5)
            ->get(['v.id', 'v.token', 'v.updated_at', 'p.first_name', 'p.last_name']);

        foreach ($recentlyDone as $r) {
            $alerts->push([
                'id'          => ++$n,
                'title'       => 'Patient cleared from theatre',
                'description' => ($r->token ?: 'THE-' . $r->id) . ' · ' . $this->patientName($r),
                'category'    => 'success',
                'createdAt'   => Carbon::parse($r->updated_at)->toIso8601String(),
            ]);
        }

        return $alerts
            ->sortByDesc('createdAt')
            ->take(20)
            ->values()
            ->all();
    }

    // ─── Charts ──────────────────────────────────────────────

    /** Patients received per month for the last 6 months. */
    private function procedureTrend(int $departmentId): array
    {
        $from = Carbon::now()->startOfMonth()->subMonths(5);

        $totals = $this->visits($departmentId)
            ->where('created_at', '>=', $from)
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as ym, COUNT(*) as total")
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $out = [];
        for ($i = 0; $i < 6; $i++) {
            $m = $from->copy()->addMonths($i);
            $out[] = [
                'month'    => $m->format('M'),
                'patients' => (int) ($totals[$m->format('Y-m')] ?? 0),
            ];
        }

        return $out;
    }

    /** Routine / urgent / emergency visits this month. */
    private function urgencyData(int $departmentId): array
    {
        $counts = $this->visits($departmentId)
            ->where('created_at', '>=', Carbon::now()->startOfMonth())
            ->selectRaw('priority, COUNT(*) as total')
            ->groupBy('priority')
            ->pluck('total', 'priority');

        return [
            ['label' => 'Routine',   'value' => (int) ($counts['routine'] ?? 0),   'color' => '#2563eb'],
            ['label' => 'Urgent',    'value' => (int) ($counts['urgent'] ?? 0),    'color' => '#f59e0b'],
            ['label' => 'Emergency', 'value' => (int) ($counts['emergency'] ?? 0), 'color' => '#dc2626'],
        ];
    }

    /** Theatre service orders this month, grouped by service name. */
    private function theatreServiceCounts(int $departmentId): Collection
    {
        if (
            !Schema::hasTable(self::ORDER_TABLE)
            || !Schema::hasColumn(self::ORDER_TABLE, 'service_id')
            || !Schema::hasColumn(self::ORDER_TABLE, 'created_at')
        ) {
            return collect();
        }

        return DB::table(self::ORDER_TABLE . ' as o')
            ->join('services as s', 's.id', '=', 'o.service_id')
            ->whereNull('s.deleted_at')
            ->where('s.department_id', $departmentId)
            ->where('o.created_at', '>=', Carbon::now()->startOfMonth())
            ->selectRaw('s.service_name as name, COUNT(*) as total')
            ->groupBy('s.service_name')
            ->orderByDesc('total')
            ->get();
    }

    private function procedureData(Collection $counts): array
    {
        return $counts
            ->reject(fn($r) => stripos($r->name, 'anaesthesia') !== false)
            ->take(6)
            ->values()
            ->map(fn($r, $i) => [
                'label' => $r->name,
                'value' => (int) $r->total,
                'color' => self::COLORS[$i % count(self::COLORS)],
            ])
            ->all();
    }

    private function anaesthesiaData(Collection $counts): array
    {
        return $counts
            ->filter(fn($r) => stripos($r->name, 'anaesthesia') !== false)
            ->values()
            ->map(fn($r, $i) => [
                'label' => trim(str_ireplace('anaesthesia', '', $r->name)),
                'value' => (int) $r->total,
                'color' => self::COLORS[$i % count(self::COLORS)],
            ])
            ->all();
    }

    // ─── Helpers ─────────────────────────────────────────────

    private function patientName(object $row): string
    {
        $name = trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? ''));

        return $name !== '' ? $name : 'Unknown';
    }
}
