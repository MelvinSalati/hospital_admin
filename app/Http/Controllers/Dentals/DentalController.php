<?php

namespace App\Http\Controllers\Dentals;

use App\Http\Controllers\Controller;
use App\Repositories\Appointments\AppointmentRepository;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\PatientVisit;

class DentalController extends Controller
{
    // Table names (adjust here if yours differ)
    private const T_PATIENTS     = 'patients';
    private const T_VISITS       = 'patient_visits';
    private const T_ORDERS       = 'dental_order_items';
    private const T_APPOINTMENTS = 'appointments';

    // Window used by the service / status / priority breakdown cards
    private const BREAKDOWN_DAYS = 90;

    // Order date falls back to created_at when ordered_at is NULL
    private const ORDER_DATE_SQL = 'COALESCE(ordered_at, created_at)';

    // Used to recognise dental appointments (appointments has no reliable department link)
    private const DENTAL_KEYWORDS = [
        'dental',
        'dentist',
        'tooth',
        'teeth',
        'extraction',
        'denture',
        'root canal',
        'orthodon',
        'scaling',
    ];

    private const URGENT_PRIORITIES = ['urgent', 'stat', 'emergency'];

    private const CHART_COLORS = [
        '#2563eb',
        '#16a34a',
        '#d97706',
        '#9333ea',
        '#0d9488',
        '#dc2626',
        '#0891b2',
        '#7c3aed',
    ];

    // =====================================================================
    // DASHBOARD
    // =====================================================================

    public function dashboard(Request $request, $departmentId): Response
    {
        return $this->renderDashboard($request, (int) $departmentId);
    }

    /**
     * Display Dental department dashboard.
     */
    public function index(Request $request, int $departmentId): Response
    {
        return $this->renderDashboard($request, $departmentId);
    }

    private function renderDashboard(Request $request, int $departmentId): Response
    {
        $today = Carbon::today();

        return Inertia::render('dentals/dashboard', [
            'departmentId'        => $departmentId,
            'userName'            => $request->user()?->name ?? 'Dental User',
            'stats'               => $this->dashboardStats($departmentId, $today),
            'visits'              => $this->todaysVisits($departmentId, $today),
            'alerts'              => $this->dashboardAlerts($departmentId, $today),
            'serviceData'         => $this->serviceBreakdown($today),
            'attendanceTrend'     => $this->attendanceTrend($departmentId, $today),
            'treatmentStatusData' => $this->treatmentStatusBreakdown($today),
            'visitPriorityData'   => $this->visitPriorityBreakdown($departmentId, $today),
            'breakdownDays'       => self::BREAKDOWN_DAYS,
        ]);
    }

    /**
     * Applies the "this looks like a dental appointment" filter to an
     * appointments query aliased as `a`.
     */
    private function dentalAppointmentScope($query, int $departmentId): void
    {
        $query->where(function ($q) use ($departmentId) {
            $q->where('a.department', (string) $departmentId);

            foreach (self::DENTAL_KEYWORDS as $keyword) {
                $q->orWhere('a.reason', 'like', "%{$keyword}%")
                    ->orWhere('a.notes', 'like', "%{$keyword}%");
            }
        });
    }

    // -------------------------------------------------
    // 1. Stats
    // -------------------------------------------------
    private function dashboardStats(int $departmentId, Carbon $today): array
    {
        // Active patients who have been seen in dental (visit in this department or a dental order)
        $dentalPatients = DB::table(self::T_PATIENTS . ' as p')
            ->where('p.status', 'active')
            ->whereNull('p.deleted_at')
            ->where(function ($q) use ($departmentId) {
                $q->whereIn('p.id', function ($sub) use ($departmentId) {
                    $sub->select('patient_id')
                        ->from(self::T_VISITS)
                        ->where('department_id', $departmentId)
                        ->whereNotNull('patient_id');
                })->orWhereIn('p.id', function ($sub) {
                    $sub->select('patient_id')->from(self::T_ORDERS);
                });
            })
            ->count();

        $visitsToday = DB::table(self::T_VISITS)
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->count();

        $activeTreatments = DB::table(self::T_ORDERS)
            ->where('status', 'pending')
            ->count();

        $urgentOrders = DB::table(self::T_ORDERS)
            ->where('status', 'pending')
            ->whereIn('priority', self::URGENT_PRIORITIES)
            ->count();

        $emergencyAppointments = DB::table(self::T_APPOINTMENTS . ' as a')
            ->whereNull('a.deleted_at')
            ->where('a.priority', 'emergency')
            ->whereIn('a.status', ['pending', 'confirmed', 'checked_in'])
            ->whereDate('a.appointment_date', '>=', $today)
            ->where(fn($q) => $this->dentalAppointmentScope($q, $departmentId))
            ->count();

        return [
            'registeredPatients' => $dentalPatients,
            'visitsToday'        => $visitsToday,
            'activeTreatments'   => $activeTreatments,
            'urgentReferrals'    => $urgentOrders + $emergencyAppointments,
        ];
    }

    // -------------------------------------------------
    // 2. Today's dental visits (queue)
    // -------------------------------------------------
    private function todaysVisits(int $departmentId, Carbon $today): array
    {
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
                'v.updated_at',
                'p.first_name',
                'p.last_name',
                'p.patient_number',
            ])
            ->get();

        if ($visitRows->isEmpty()) {
            return [];
        }

        $tokens     = $visitRows->pluck('token')->filter()->unique()->values()->all();
        $patientIds = $visitRows->pluck('patient_id')->filter()->unique()->values()->all();

        // One query for all related orders (avoids N+1), newest first
        $orders = DB::table(self::T_ORDERS)
            ->where(function ($q) use ($tokens, $patientIds, $today) {
                if (!empty($tokens)) {
                    $q->whereIn('visit_token', $tokens);
                }

                $q->orWhere(function ($w) use ($patientIds, $today) {
                    $w->whereIn('patient_id', $patientIds)
                        ->whereRaw('DATE(' . self::ORDER_DATE_SQL . ') = ?', [$today->toDateString()]);
                });
            })
            ->orderByDesc(DB::raw(self::ORDER_DATE_SQL))
            ->get();

        return $visitRows
            ->map(function ($visit) use ($orders) {
                $isFinished = (int) $visit->status === 0;

                // Finished visits stop the clock at their last update
                $endTime = $isFinished && $visit->updated_at
                    ? Carbon::parse($visit->updated_at)
                    : now();

                $minutesWaiting = $visit->created_at
                    ? (int) abs(Carbon::parse($visit->created_at)->diffInMinutes($endTime))
                    : 0;

                // Prefer an order carrying this visit's token, else the patient's latest order today
                $order = ($visit->token ? $orders->firstWhere('visit_token', $visit->token) : null)
                    ?? $orders->firstWhere('patient_id', $visit->patient_id);

                if ($isFinished) {
                    $status = 'completed';
                } elseif ($order) {
                    $status = match ($order->status) {
                        'completed' => 'completed',
                        'pending'   => $minutesWaiting > 30 ? 'waiting' : 'in-progress',
                        default     => 'waiting',
                    };
                } else {
                    $status = 'waiting';
                }

                return [
                    'id'             => $visit->id,
                    'patientCode'    => $visit->patient_number ?? 'N/A',
                    'name'           => trim(($visit->first_name ?? '') . ' ' . ($visit->last_name ?? '')),
                    'service'        => $order->service_name ?? 'Dental Consultation',
                    'waitingMinutes' => $minutesWaiting,
                    'status'         => $status,
                ];
            })
            ->values()
            ->toArray();
    }

    // -------------------------------------------------
    // 3. Service breakdown
    // -------------------------------------------------
    private function serviceBreakdown(Carbon $today): array
    {
        $since = $today->copy()->subDays(self::BREAKDOWN_DAYS);

        return DB::table(self::T_ORDERS)
            ->select('service_name', DB::raw('COUNT(*) as total'))
            ->whereRaw(self::ORDER_DATE_SQL . ' >= ?', [$since])
            ->where('status', '!=', 'cancelled')
            ->groupBy('service_name')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->values()
            ->map(fn($row, $index) => [
                'label' => $row->service_name,
                'value' => (int) $row->total,
                'color' => self::CHART_COLORS[$index % count(self::CHART_COLORS)],
            ])
            ->toArray();
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
            ->orderBy('month_key')
            ->get()
            ->keyBy('month_key');

        $trend = [];

        for ($i = 5; $i >= 0; $i--) {
            $date = $today->copy()->startOfMonth()->subMonths($i);
            $key  = $date->format('Y-m');

            $trend[] = [
                'month'  => $date->format('M'),
                'visits' => (int) ($raw[$key]->visits ?? 0),
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

        // Urgent pending dental orders
        $urgentOrders = DB::table(self::T_ORDERS . ' as o')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'o.patient_id')
            ->where('o.status', 'pending')
            ->whereIn('o.priority', self::URGENT_PRIORITIES)
            ->orderByDesc(DB::raw('COALESCE(o.ordered_at, o.created_at)'))
            ->limit(5)
            ->select('o.id', 'o.service_name', 'o.ordered_at', 'o.created_at', 'p.patient_number')
            ->get();

        foreach ($urgentOrders as $order) {
            $when = $order->ordered_at ?? $order->created_at;

            $alerts[] = [
                'id'          => $order->id,
                'title'       => 'Urgent dental order',
                'description' => ($order->patient_number ?? 'Patient') . ' · ' . $order->service_name,
                'category'    => 'danger',
                'time'        => $when ? Carbon::parse($when)->diffForHumans() : 'Recently',
            ];
        }

        // Upcoming dental appointments (next 7 days)
        $upcoming = DB::table(self::T_APPOINTMENTS . ' as a')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'a.patient_id')
            ->whereNull('a.deleted_at')
            ->whereIn('a.status', ['pending', 'confirmed', 'upcoming'])
            ->whereBetween('a.appointment_date', [$today->toDateString(), $today->copy()->addDays(7)->toDateString()])
            ->where(fn($q) => $this->dentalAppointmentScope($q, $departmentId))
            ->orderBy('a.appointment_date')
            ->orderBy('a.appointment_time')
            ->limit(5)
            ->select('a.id', 'a.reason', 'a.appointment_date', 'a.appointment_time', 'p.patient_number')
            ->get();

        foreach ($upcoming as $appt) {
            $alerts[] = [
                'id'          => 1000000 + $appt->id,
                'title'       => 'Upcoming dental appointment',
                'description' => ($appt->patient_number ?? 'Patient') . ' · ' . ($appt->reason ?: 'Dental consultation'),
                'category'    => 'warning',
                'time'        => Carbon::parse($appt->appointment_date . ' ' . $appt->appointment_time)->diffForHumans(),
            ];
        }

        // Treatments completed in the last 24 hours
        $completed = DB::table(self::T_ORDERS . ' as o')
            ->leftJoin(self::T_PATIENTS . ' as p', 'p.id', '=', 'o.patient_id')
            ->where('o.status', 'completed')
            ->whereRaw('COALESCE(o.performed_date, o.updated_at) >= ?', [now()->subHours(24)])
            ->orderByDesc(DB::raw('COALESCE(o.performed_date, o.updated_at)'))
            ->limit(3)
            ->select('o.id', 'o.service_name', 'o.performed_date', 'o.updated_at', 'p.patient_number')
            ->get();

        foreach ($completed as $item) {
            $when = $item->performed_date ?? $item->updated_at;

            $alerts[] = [
                'id'          => 2000000 + $item->id,
                'title'       => 'Dental treatment completed',
                'description' => ($item->patient_number ?? 'Patient') . ' · ' . $item->service_name,
                'category'    => 'success',
                'time'        => $when ? Carbon::parse($when)->diffForHumans() : 'Recently',
            ];
        }

        return collect($alerts)->take(10)->values()->toArray();
    }

    // -------------------------------------------------
    // 6. Treatment status (dental orders)
    // -------------------------------------------------
    private function treatmentStatusBreakdown(Carbon $today): array
    {
        $since = $today->copy()->subDays(self::BREAKDOWN_DAYS);

        $counts = DB::table(self::T_ORDERS)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->whereRaw(self::ORDER_DATE_SQL . ' >= ?', [$since])
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            ['label' => 'Pending',   'value' => (int) ($counts['pending'] ?? 0),   'color' => '#f59e0b'],
            ['label' => 'Completed', 'value' => (int) ($counts['completed'] ?? 0), 'color' => '#16a34a'],
            ['label' => 'Cancelled', 'value' => (int) ($counts['cancelled'] ?? 0), 'color' => '#dc2626'],
        ];
    }

    // -------------------------------------------------
    // 7. Visit priority (dental department visits)
    // -------------------------------------------------
    private function visitPriorityBreakdown(int $departmentId, Carbon $today): array
    {
        $since = $today->copy()->subDays(self::BREAKDOWN_DAYS);

        $counts = DB::table(self::T_VISITS)
            ->select('priority', DB::raw('COUNT(*) as total'))
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', $since)
            ->groupBy('priority')
            ->pluck('total', 'priority');

        return [
            ['label' => 'Routine',   'value' => (int) ($counts['routine'] ?? 0),   'color' => '#2563eb'],
            ['label' => 'Urgent',    'value' => (int) ($counts['urgent'] ?? 0),    'color' => '#f59e0b'],
            ['label' => 'Emergency', 'value' => (int) ($counts['emergency'] ?? 0), 'color' => '#dc2626'],
        ];
    }

    // =====================================================================
    // EXISTING ACTIONS (unchanged)
    // =====================================================================

    public function appointments(int  $departmentId)
    {
        return Inertia::render('dentals/appointments', [
            'appointments' => AppointmentRepository::getAppointments($departmentId)
        ]);
    }
    public function processed(int $departmentId)
    {
        // Get all active visit tokens with patient and visit information
        $queuedPatients = \App\Models\PatientVisit::with(['patient', 'assignedStaff', 'visitToken'])
            ->where('department_id', $departmentId)
            ->where('status', 0)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($visit) {

                return [
                    'id' => $visit->id,
                    'token' => $visit->visitToken ? $visit->visitToken->token : 'T-' . str_pad($visit->id, 4, '0', STR_PAD_LEFT),
                    'visit_token_id' => $visit->visitToken?->id,
                    'patient_id' => $visit->patient_id,
                    'patient_number' => $visit->patient->patient_number,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'contact' => $visit->patient?->phone ?? 'N/A',
                    'gender' => $visit->patient?->gender ?? 'N/A',
                    'payment_method' => $visit->payment_method,
                    'original_payment_method' => $visit->visitToken?->original_payment_method ?? $visit->original_payment_method,
                    'status' => $visit->status,
                    'registered_at' => $visit->started_at ? $visit->started_at->format('Y-m-d H:i:s') : $visit->created_at->format('Y-m-d H:i:s'),
                    'assigned_department' => $visit->assignedDepartment?->department_name ?? 'Not assigned',
                    'assigned_staff' => $visit->assignedStaff?->name ?? 'Not assigned',
                    'visit_status' => $this->mapVisitStatus($visit->status),
                    'priority' => $visit->priority ?? 'routine',
                    'department_id' => $visit->department_id,
                ];
            });

        return Inertia::render('opthamology/queue', [
            'queue' => $queuedPatients
        ]);
    }
    public function queue(int $departmentId)
    {
        // Get all active visit tokens with patient and visit information
        $queuedPatients = \App\Models\PatientVisit::with(['patient', 'assignedStaff', 'visitToken'])
            ->where('department_id', $departmentId)
            ->where('status', 1)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($visit) {

                return [
                    'id' => $visit->id,
                    'token' => $visit->visitToken ? $visit->visitToken->token : 'T-' . str_pad($visit->id, 4, '0', STR_PAD_LEFT),
                    'visit_token_id' => $visit->visitToken?->id,
                    'patient_id' => $visit->patient_id,
                    'patient_number' => $visit->patient->patient_number,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'contact' => $visit->patient?->phone ?? 'N/A',
                    'gender' => $visit->patient?->gender ?? 'N/A',
                    'payment_method' => $visit->payment_method,
                    'original_payment_method' => $visit->visitToken?->original_payment_method ?? $visit->original_payment_method,
                    'status' => $visit->status,
                    'registered_at' => $visit->started_at ? $visit->started_at->format('Y-m-d H:i:s') : $visit->created_at->format('Y-m-d H:i:s'),
                    'assigned_department' => $visit->assignedDepartment?->department_name ?? 'Not assigned',
                    'assigned_staff' => $visit->assignedStaff?->name ?? 'Not assigned',
                    'visit_status' => $this->mapVisitStatus($visit->status),
                    'priority' => $visit->priority ?? 'routine',
                    'department_id' => $visit->department_id,
                ];
            });

        return Inertia::render('opthamology/queue', [
            'queue' => $queuedPatients
        ]);
    }

    public function bulkOrders(int $departmentId)
    {
        return Inertia::render('dentals/bulkstore', [
            'services' => \App\Models\Services\Service::all(),
            'orderedItems' => \App\Models\BulkStores\DepartmentRequisition::with([
                'department:id,name',
                'requestedBy:id,name',
                'items.product:id,product_name,product_code',
            ])->where('department_id', $departmentId)
                ->latest()
                ->get()
                ->map(function ($req) {
                    return [
                        'id'                 => $req->id,
                        'requisition_uuid'   => $req->requisition_uuid,
                        'requisition_number' => $req->requisition_number,
                        'status'             => $req->status,
                        'priority'           => $req->priority,
                        'requested_at'       => $req->requested_at?->toIso8601String(),
                        'required_by_date'   => $req->required_by_date?->format('Y-m-d'),
                        'estimated_total'    => (float) ($req->estimated_total ?? 0),
                        'items_count'        => $req->items->count(),
                        'department'         => $req->department?->name,
                        'requested_by'       => $req->requestedBy?->name,
                        'justification'      => $req->justification,

                        // ─── line items for the details modal ───
                        'items' => $req->items->map(function ($item) {
                            return [
                                'id'                    => $item->id,
                                'product_id'            => $item->product_id,
                                'product_name'          => $item->product?->product_name ?? 'Unknown',
                                'product_code'          => $item->product?->product_code,
                                'quantity_requested'    => $item->quantity_requested,
                                'quantity_approved'     => $item->quantity_approved,
                                'quantity_fulfilled'    => $item->quantity_fulfilled,
                                'unit'                  => $item->unit,
                                'estimated_unit_price'  => (float) ($item->estimated_unit_price ?? 0),
                                'estimated_total'       => (float) ($item->estimated_total ?? 0),
                                'batch_number'          => $item->batch_number,
                                'expiry_date'           => $item->expiry_date?->format('Y-m-d'),
                                'status'                => $item->status,
                                'notes'                 => $item->notes,
                            ];
                        })->values(),
                    ];
                }),
        ]);
    }
}
