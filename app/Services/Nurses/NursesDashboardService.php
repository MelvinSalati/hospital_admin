<?php

namespace App\Services\Nurses;

use App\Models\Patients\Patient;
use App\Models\PatientVisit;
use App\Models\Patients\VitalSign;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class NursesDashboardService
{
    /**
     * Nurses Bay department ID (from your departments table).
     */
    protected int $nursesDepartmentId = 6;

    /**
     * Main entry point – returns everything the React dashboard expects.
     */
    public function getDashboardData(int $departmentId): array
    {
        return [
            'stats'            => $this->getStats($departmentId),
            'visits'           => $this->getTodayVisits($departmentId),
            'alerts'           => $this->getAlerts($departmentId),
            'serviceData'      => $this->getServiceBreakdown($departmentId),
            'attendanceTrend'  => $this->getAttendanceTrend($departmentId),
            'visualAcuityData' => $this->getVitalsSummary($departmentId),   // repurposed for nurses
            'outcomeData'      => $this->getOutcomeSummary($departmentId),
        ];
    }

    /* -----------------------------------------------------------------
     |  KPI Cards
     | -----------------------------------------------------------------
     */

    public function getStats(int $departmentId): array
    {
        $today = Carbon::today();

        // Patients who have ever visited Nurses Bay
        $registeredPatients = PatientVisit::query()
            ->where('department_id', $departmentId)
            ->distinct('patient_id')
            ->count('patient_id');

        // Visits that arrived today (any status)
        $visitsToday = PatientVisit::query()
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->count();

        // Currently active (status = 1 means still in queue / in progress)
        $activeTreatments = PatientVisit::query()
            ->where('department_id', $departmentId)
            ->where('status', 1)
            ->count();

        // Urgent / emergency priority visits still open
        $urgentReferrals = PatientVisit::query()
            ->where('department_id', $departmentId)
            ->whereIn('priority', ['urgent', 'emergency'])
            ->where('status', 1)
            ->count();

        return [
            'registeredPatients' => $registeredPatients,
            'visitsToday'        => $visitsToday,
            'activeTreatments'   => $activeTreatments,
            'urgentReferrals'    => $urgentReferrals,
        ];
    }

    /* -----------------------------------------------------------------
     |  Today's queue (left side table)
     | -----------------------------------------------------------------
     */

    public function getTodayVisits(int $departmentId): array
    {
        $today = Carbon::today();

        $rows = PatientVisit::query()
            ->with(['patient:id,first_name,last_name,patient_number'])
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->orderByRaw("FIELD(priority, 'emergency', 'urgent', 'routine')")
            ->orderBy('created_at')
            ->get();

        return $rows->map(function (PatientVisit $visit) {
            $patient = $visit->patient;

            $waitingMinutes = $visit->created_at
                ? (int) $visit->created_at->diffInMinutes(now())
                : 0;

            // Map your integer status to the React status strings
            $status = match ((int) $visit->status) {
                0       => 'completed',
                1       => $waitingMinutes > 30 ? 'waiting' : 'in-progress',
                default => 'waiting',
            };

            return [
                'id'             => $visit->id,
                'patientCode'    => $patient?->patient_number ?? 'N/A',
                'name'           => trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? '')),
                'service'        => $this->resolveServiceLabel($visit),
                'waitingMinutes' => $waitingMinutes,
                'status'         => $status,
                'priority'       => $visit->priority,
                'token'          => $visit->token,
            ];
        })->values()->all();
    }

    /* -----------------------------------------------------------------
     |  Alerts / Notifications panel
     | -----------------------------------------------------------------
     */

    public function getAlerts(int $departmentId): array
    {
        $alerts = collect();

        // 1. Open urgent / emergency visits
        $urgentVisits = PatientVisit::query()
            ->with('patient:id,first_name,last_name,patient_number')
            ->where('department_id', $departmentId)
            ->whereIn('priority', ['urgent', 'emergency'])
            ->where('status', 1)
            ->latest()
            ->limit(5)
            ->get();

        foreach ($urgentVisits as $visit) {
            $name = trim(($visit->patient?->first_name ?? '') . ' ' . ($visit->patient?->last_name ?? ''));
            $alerts->push([
                'id'          => 'urgent-' . $visit->id,
                'title'       => ucfirst($visit->priority) . ' triage required',
                'description' => ($visit->patient?->patient_number ?? 'N/A') . ' · ' . $name,
                'category'    => $visit->priority === 'emergency' ? 'danger' : 'warning',
                'time'        => $visit->created_at?->diffForHumans() ?? '',
            ]);
        }

        // 2. Abnormal vitals recorded in the last 24 h
        $abnormalVitals = VitalSign::query()
            ->where('recorded_at', '>=', now()->subDay())
            ->where(function ($q) {
                $q->where('systolic_bp', '>', 140)
                    ->orWhere('diastolic_bp', '>', 90)
                    ->orWhere('temperature', '>', 37.5)
                    ->orWhere('spO2', '<', 94)
                    ->orWhere('pulse_rate', '>', 100)
                    ->orWhere('pulse_rate', '<', 50);
            })
            ->latest('recorded_at')
            ->limit(5)
            ->get();

        foreach ($abnormalVitals as $vital) {
            $patient = Patient::find($vital->patient_id);
            $name = $patient
                ? trim($patient->first_name . ' ' . $patient->last_name)
                : 'Unknown patient';

            $alerts->push([
                'id'          => 'vital-' . $vital->id,
                'title'       => 'Abnormal vital signs',
                'description' => ($patient?->patient_number ?? 'N/A') . ' · ' . $name,
                'category'    => 'warning',
                'time'        => $vital->recorded_at?->diffForHumans() ?? '',
            ]);
        }

        // 3. Visits waiting > 45 minutes
        $longWaits = PatientVisit::query()
            ->with('patient:id,first_name,last_name,patient_number')
            ->where('department_id', $departmentId)
            ->where('status', 1)
            ->where('created_at', '<=', now()->subMinutes(45))
            ->latest()
            ->limit(3)
            ->get();

        foreach ($longWaits as $visit) {
            $name = trim(($visit->patient?->first_name ?? '') . ' ' . ($visit->patient?->last_name ?? ''));
            $alerts->push([
                'id'          => 'wait-' . $visit->id,
                'title'       => 'Long waiting time',
                'description' => ($visit->patient?->patient_number ?? 'N/A') . ' · ' . $name . ' (>45 min)',
                'category'    => 'info',
                'time'        => $visit->created_at?->diffForHumans() ?? '',
            ]);
        }

        return $alerts
            ->sortByDesc(fn($a) => $a['time'])
            ->values()
            ->take(12)
            ->all();
    }

    /* -----------------------------------------------------------------
     |  Service distribution (donut)
     | -----------------------------------------------------------------
     */

    public function getServiceBreakdown(int $departmentId): array
    {
        // Count visits per priority (acts as "service type" for nurses)
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

        $data = [];
        foreach (['routine', 'urgent', 'emergency'] as $priority) {
            $data[] = [
                'label' => ucfirst($priority),
                'value' => (int) ($counts[$priority] ?? 0),
                'color' => $palette[$priority],
            ];
        }

        return $data;
    }

    /* -----------------------------------------------------------------
     |  Attendance trend (last 6 months)
     | -----------------------------------------------------------------
     */

    public function getAttendanceTrend(int $departmentId): array
    {
        $start = now()->subMonths(5)->startOfMonth();

        $rows = PatientVisit::query()
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', $start)
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%b') as month"),
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as ym"),
                DB::raw('COUNT(*) as visits')
            )
            ->groupBy('ym', 'month')
            ->orderBy('ym')
            ->get();

        // Ensure we always return the last 6 months even if some have zero
        $months = collect();
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $months->push([
                'month'  => $date->format('M'),
                'ym'     => $date->format('Y-m'),
                'visits' => 0,
            ]);
        }

        $lookup = $rows->keyBy('ym');

        return $months->map(function ($item) use ($lookup) {
            return [
                'month'  => $item['month'],
                'visits' => (int) ($lookup[$item['ym']]->visits ?? 0),
            ];
        })->values()->all();
    }

    /* -----------------------------------------------------------------
     |  Vitals summary (replaces Visual Acuity card)
     | -----------------------------------------------------------------
     */

    public function getVitalsSummary(int $departmentId): array
    {
        $vitals = VitalSign::query()
            ->where('recorded_at', '>=', now()->subDays(30))
            ->get();

        $normal = 0;
        $elevatedBp = 0;
        $fever = 0;
        $lowSpo2 = 0;
        $tachycardia = 0;

        foreach ($vitals as $v) {
            $isAbnormal = false;

            if (($v->systolic_bp ?? 0) > 140 || ($v->diastolic_bp ?? 0) > 90) {
                $elevatedBp++;
                $isAbnormal = true;
            }
            if (($v->temperature ?? 0) > 37.5) {
                $fever++;
                $isAbnormal = true;
            }
            if (($v->spO2 ?? 100) < 94) {
                $lowSpo2++;
                $isAbnormal = true;
            }
            if (($v->pulse_rate ?? 0) > 100) {
                $tachycardia++;
                $isAbnormal = true;
            }

            if (!$isAbnormal) {
                $normal++;
            }
        }

        return [
            ['label' => 'Normal vitals',     'value' => $normal,      'color' => '#16a34a'],
            ['label' => 'Elevated BP',       'value' => $elevatedBp,  'color' => '#d97706'],
            ['label' => 'Fever (>37.5°C)',   'value' => $fever,       'color' => '#ea580c'],
            ['label' => 'Low SpO₂',          'value' => $lowSpo2,     'color' => '#dc2626'],
            ['label' => 'Tachycardia',       'value' => $tachycardia, 'color' => '#9333ea'],
        ];
    }

    /* -----------------------------------------------------------------
     |  Outcome / disposition summary
     | -----------------------------------------------------------------
     */


    public function getOutcomeSummary(int $departmentId): array
    {
        // Based on status of visits in the last 30 days
        $base = PatientVisit::query()
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', now()->subDays(30));

        $completed = (clone $base)
            ->where('status', 0)
            ->count();

        $inProgress = (clone $base)
            ->where('status', 1)
            ->count();

        $referred = PatientVisit::query()
            ->whereIn('patient_id', function ($q) use ($departmentId) {
                $q->select('patient_id')
                    ->from('patient_visits')
                    ->where('department_id', $departmentId)
                    ->where('created_at', '>=', now()->subDays(30));
            })
            ->where('department_id', '!=', $departmentId)
            ->where('created_at', '>=', now()->subDays(30))
            ->distinct()
            ->count('patient_id');

        return [
            [
                'label' => 'Completed triage',
                'value' => $completed,
                'color' => '#16a34a',
            ],
            [
                'label' => 'Still in queue',
                'value' => $inProgress,
                'color' => '#2563eb',
            ],
            [
                'label' => 'Referred onward',
                'value' => $referred,
                'color' => '#d97706',
            ],
            [
                'label' => 'Follow-up needed',
                'value' => 0,
                'color' => '#9333ea',
            ],
        ];
    }


    /* -----------------------------------------------------------------
     |  Helpers
     | -----------------------------------------------------------------
     */

    protected function resolveServiceLabel(PatientVisit $visit): string
    {
        // You can later join a real service if you store service_id on the visit.
        // For now we derive a sensible label from priority + department.
        return match ($visit->priority) {
            'emergency' => 'Emergency Triage',
            'urgent'    => 'Urgent Triage',
            default     => 'Routine Nursing Assessment',
        };
    }
}
