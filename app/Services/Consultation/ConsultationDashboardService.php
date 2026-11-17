<?php

namespace App\Services\Consultation;

use App\Models\PatientVisit;
use App\Models\Patients\VitalSign;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ConsultationDashboardService
{
    /**
     * Consultation department ID (from your departments table).
     * Replace with the real ID, or pass it in from the controller.
     */


    /**
     * Main entry point – returns everything the React dashboard expects.
     */
    public function getDashboardData(?int $departmentId = null): array
    {

        return [
            'stats'            => $this->getStats($departmentId),
            'visits'           => $this->getTodayVisits($departmentId),
            'alerts'           => $this->getAlerts($departmentId),
            'serviceData'      => $this->getServiceBreakdown($departmentId),
            'attendanceTrend'  => $this->getAttendanceTrend($departmentId),
            'visualAcuityData' => $this->getTriagedResults($departmentId), // "Triaged Results" card
            'outcomeData'      => $this->getOutcomeSummary($departmentId),
        ];
    }

    /* -----------------------------------------------------------------
     |  KPI cards
     | -----------------------------------------------------------------
     */

    public function getStats(int $departmentId): array
    {
        $base = fn() => PatientVisit::query()->where('department_id', $departmentId);

        return [
            'registeredPatients' => (int) $base()->distinct()->count('patient_id'),
            'visitsToday'        => (int) $base()->whereDate('created_at', Carbon::today())->count(),
            'activeTreatments'   => (int) $base()->where('status', 1)->count(),
            'urgentReferrals'    => (int) $base()
                ->whereIn('priority', ['urgent', 'emergency'])
                ->where('status', 1)
                ->count(),
        ];
    }

    /* -----------------------------------------------------------------
     |  Today's queue
     | -----------------------------------------------------------------
     */

    public function getTodayVisits(int $departmentId): array
    {
        $rows = PatientVisit::query()
            ->with(['patient:id,first_name,last_name,patient_number'])
            ->where('department_id', $departmentId)
            ->whereDate('created_at', Carbon::today())
            ->orderByRaw("FIELD(priority, 'emergency', 'urgent', 'routine')")
            ->orderBy('created_at')
            ->get();

        return $rows->map(function (PatientVisit $visit) {
            $patient = $visit->patient;

            $waitingMinutes = $visit->created_at
                ? (int) $visit->created_at->diffInMinutes(now())
                : 0;

            $status = match ((int) $visit->status) {
                0       => 'completed',
                1       => $waitingMinutes > 30 ? 'waiting' : 'in-progress',
                default => 'waiting',
            };

            return [
                'id'             => $visit->id,
                'patientCode'    => $patient?->patient_number ?? 'N/A',
                'name'           => $this->fullName($patient),
                'service'        => $this->resolveServiceLabel($visit),
                'waitingMinutes' => $waitingMinutes,
                'status'         => $status,
                'priority'       => $visit->priority,
                'token'          => $visit->token,
            ];
        })->values()->all();
    }

    /* -----------------------------------------------------------------
     |  Alerts / notifications
     | -----------------------------------------------------------------
     */

    public function getAlerts(int $departmentId): array
    {
        $items = collect();

        // 1. Open urgent / emergency consultations
        PatientVisit::query()
            ->with('patient:id,first_name,last_name,patient_number')
            ->where('department_id', $departmentId)
            ->whereIn('priority', ['urgent', 'emergency'])
            ->where('status', 1)
            ->latest()
            ->limit(5)
            ->get()
            ->each(function (PatientVisit $visit) use ($items) {
                $items->push([
                    'at'          => $visit->created_at,
                    'title'       => ucfirst($visit->priority) . ' consultation waiting',
                    'description' => ($visit->patient?->patient_number ?? 'N/A') . ' · ' . $this->fullName($visit->patient),
                    'category'    => $visit->priority === 'emergency' ? 'danger' : 'warning',
                ]);
            });

        // 2. Abnormal vitals (last 24h) for patients currently in this department's queue
        VitalSign::query()
            ->where('recorded_at', '>=', now()->subDay())
            ->whereIn('patient_id', $this->openQueuePatientIds($departmentId))
            ->where(function ($q) {
                $q->where('systolic_bp', '>', 140)
                    ->orWhere('diastolic_bp', '>', 90)
                    ->orWhere('temperature', '>', 37.5)
                    ->orWhere('spO2', '<', 94)
                    ->orWhere('pulse_rate', '>', 100)
                    ->orWhere('pulse_rate', '<', 50);
            })
            ->with('patient:id,first_name,last_name,patient_number')
            ->latest('recorded_at')
            ->limit(5)
            ->get()
            ->each(function (VitalSign $vital) use ($items) {
                $patient = $vital->patient ?? null;

                $items->push([
                    'at'          => $vital->recorded_at,
                    'title'       => 'Abnormal vital signs',
                    'description' => ($patient?->patient_number ?? 'N/A') . ' · ' . $this->fullName($patient),
                    'category'    => 'warning',
                ]);
            });

        // 3. Patients waiting > 45 minutes
        PatientVisit::query()
            ->with('patient:id,first_name,last_name,patient_number')
            ->where('department_id', $departmentId)
            ->where('status', 1)
            ->where('created_at', '<=', now()->subMinutes(45))
            ->latest()
            ->limit(3)
            ->get()
            ->each(function (PatientVisit $visit) use ($items) {
                $items->push([
                    'at'          => $visit->created_at,
                    'title'       => 'Long waiting time',
                    'description' => ($visit->patient?->patient_number ?? 'N/A') . ' · ' . $this->fullName($visit->patient) . ' (>45 min)',
                    'category'    => 'info',
                ]);
            });

        // 4. Recently completed consultations (success)
        PatientVisit::query()
            ->with('patient:id,first_name,last_name,patient_number')
            ->where('department_id', $departmentId)
            ->where('status', 0)
            ->whereDate('updated_at', Carbon::today())
            ->latest('updated_at')
            ->limit(3)
            ->get()
            ->each(function (PatientVisit $visit) use ($items) {
                $items->push([
                    'at'          => $visit->updated_at,
                    'title'       => 'Consultation completed',
                    'description' => ($visit->patient?->patient_number ?? 'N/A') . ' · ' . $this->fullName($visit->patient),
                    'category'    => 'success',
                ]);
            });

        // Sort by the real timestamp (not the "x minutes ago" string), newest first.
        return $items
            ->sortByDesc(fn($a) => $a['at']?->timestamp ?? 0)
            ->take(12)
            ->values()
            ->map(fn($a, $i) => [
                'id'          => $i + 1,
                'title'       => $a['title'],
                'description' => $a['description'],
                'category'    => $a['category'],
                'time'        => $a['at']?->diffForHumans() ?? '',
            ])
            ->all();
    }

    /* -----------------------------------------------------------------
     |  Service distribution (last 30 days, by priority)
     | -----------------------------------------------------------------
     */

    public function getServiceBreakdown(int $departmentId): array
    {
        $counts = PatientVisit::query()
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', now()->subDays(30))
            ->select('priority', DB::raw('COUNT(*) as total'))
            ->groupBy('priority')
            ->pluck('total', 'priority');

        $palette = [
            'routine'   => '#2563eb',
            'urgent'    => '#d97706',
            'emergency' => '#dc2626',
        ];

        return collect($palette)->map(fn($color, $priority) => [
            'label' => ucfirst($priority),
            'value' => (int) ($counts[$priority] ?? 0),
            'color' => $color,
        ])->values()->all();
    }

    /* -----------------------------------------------------------------
     |  Attendance trend (last 6 months, zero-filled)
     | -----------------------------------------------------------------
     */

    public function getAttendanceTrend(int $departmentId): array
    {
        $start = now()->subMonths(5)->startOfMonth();

        $lookup = PatientVisit::query()
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', $start)
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as ym"),
                DB::raw('COUNT(*) as visits')
            )
            ->groupBy('ym')
            ->pluck('visits', 'ym');

        return collect(range(5, 0))->map(function ($i) use ($lookup) {
            $date = now()->startOfMonth()->subMonths($i);

            return [
                'month'  => $date->format('M'),
                'visits' => (int) ($lookup[$date->format('Y-m')] ?? 0),
            ];
        })->values()->all();
    }

    /* -----------------------------------------------------------------
     |  "Triaged Results" – vitals classification for consultation patients
     | -----------------------------------------------------------------
     */

    public function getTriagedResults(int $departmentId): array
    {
        $patientIds = PatientVisit::query()
            ->select('patient_id')
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', now()->subDays(30));

        $vitals = VitalSign::query()
            ->where('recorded_at', '>=', now()->subDays(30))
            ->whereIn('patient_id', $patientIds)
            ->get();

        $normal = $elevatedBp = $fever = $lowSpo2 = $tachycardia = 0;

        foreach ($vitals as $v) {
            $abnormal = false;

            if (($v->systolic_bp ?? 0) > 140 || ($v->diastolic_bp ?? 0) > 90) {
                $elevatedBp++;
                $abnormal = true;
            }
            if (($v->temperature ?? 0) > 37.5) {
                $fever++;
                $abnormal = true;
            }
            if (($v->spO2 ?? 100) < 94) {
                $lowSpo2++;
                $abnormal = true;
            }
            if (($v->pulse_rate ?? 0) > 100) {
                $tachycardia++;
                $abnormal = true;
            }

            if (! $abnormal) {
                $normal++;
            }
        }

        return [
            ['label' => 'Normal vitals',   'value' => $normal,      'color' => '#16a34a'],
            ['label' => 'Elevated BP',     'value' => $elevatedBp,  'color' => '#d97706'],
            ['label' => 'Fever (>37.5°C)', 'value' => $fever,       'color' => '#ea580c'],
            ['label' => 'Low SpO₂',        'value' => $lowSpo2,     'color' => '#dc2626'],
            ['label' => 'Tachycardia',     'value' => $tachycardia, 'color' => '#9333ea'],
        ];
    }

    /* -----------------------------------------------------------------
     |  Outcome summary (last 30 days)
     | -----------------------------------------------------------------
     */

    public function getOutcomeSummary(int $departmentId): array
    {
        $since = now()->subDays(30);

        $base = fn() => PatientVisit::query()
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', $since);

        $completed  = (int) $base()->where('status', 0)->count();
        $inProgress = (int) $base()->where('status', 1)->count();

        // Patients seen here who then had a visit in another department
        $referred = (int) PatientVisit::query()
            ->where('department_id', '!=', $departmentId)
            ->where('created_at', '>=', $since)
            ->whereIn('patient_id', $base()->select('patient_id'))
            ->distinct()
            ->count('patient_id');

        return [
            ['label' => 'Consultation completed', 'value' => $completed,  'color' => '#16a34a'],
            ['label' => 'Still in queue',         'value' => $inProgress, 'color' => '#2563eb'],
            ['label' => 'Referred onward',        'value' => $referred,   'color' => '#d97706'],
            ['label' => 'Follow-up required',     'value' => 0,           'color' => '#9333ea'], // wire to follow-up/appointments table when available
        ];
    }

    /* -----------------------------------------------------------------
     |  Helpers
     | -----------------------------------------------------------------
     */

    protected function openQueuePatientIds(int $departmentId)
    {
        return PatientVisit::query()
            ->select('patient_id')
            ->where('department_id', $departmentId)
            ->where('status', 1);
    }

    protected function fullName($patient): string
    {
        return trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? ''));
    }

    protected function resolveServiceLabel(PatientVisit $visit): string
    {
        return match ($visit->priority) {
            'emergency' => 'Emergency Consultation',
            'urgent'    => 'Urgent Consultation',
            default     => 'General Consultation',
        };
    }
}
