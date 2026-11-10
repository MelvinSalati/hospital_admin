<?php

namespace App\Repositories\Dashboards;

use App\Models\Patients\LabOrder;
use App\Models\Patients\LabOrderItem;
use App\Models\Laboratories\LabResultItem;
use App\Models\Patients\ImagingResult;
use App\Models\Patients\ImagingResultFile;
use App\Models\Patients\ImagingOrder;
use App\Models\Patients\ImagingOrderItem;
use App\Models\PatientVisit;
use Illuminate\Support\Facades\Storage;
use App\Models\Patients\Prescription;
use App\Models\Patients\PrescriptionItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardRepository
{
    public function __construct()
    {
        //
    }

    public function create(int $departmentId)
    {
        return match ($departmentId) {
            1 => $this->pharmacyDashboard($departmentId),
            3 => $this->laboratoryDashboard($departmentId),
            4 => $this->theatreDashboard($departmentId),
            5 => $this->radiologyDashboard($departmentId),
            7 => $this->maternalChildHealthDashboard($departmentId),
            8 => $this->dentalDashboard($departmentId),
            9 => $this->ophthalmologyDashboard($departmentId),
            default => throw new \InvalidArgumentException(
                "Unsupported department: {$departmentId}"
            ),
        };
    }

    /* ====================================================================== */
    /*                            RADIOLOGY                                   */
    /* ====================================================================== */

    public function radiologyDashboard(int $departmentId)
    {
        $today = Carbon::today();

        $defaultImage = 'https://images.unsplash.com/photo-1769204978162-55d6fdb408ce?q=80&w=887&auto=format&fit=crop';

        $pendingStatuses = ['pending', 'scheduled', 'in_progress'];
        $doneStatuses    = ['performed', 'reported', 'completed', 'processed'];

        $orders = ImagingOrder::whereIn('status', $pendingStatuses)->count();

        $processed = ImagingOrder::whereIn('status', $doneStatuses)
            ->where(function ($q) use ($today) {
                $q->whereDate('reported_date', $today)
                    ->orWhere(function ($q2) use ($today) {
                        $q2->whereNull('reported_date')
                            ->whereDate('performed_date', $today);
                    });
            })
            ->count();

        $patientsSeen = ImagingOrder::whereIn('status', $doneStatuses)
            ->where(function ($q) use ($today) {
                $q->whereDate('reported_date', $today)
                    ->orWhere(function ($q2) use ($today) {
                        $q2->whereNull('reported_date')
                            ->whereDate('performed_date', $today);
                    });
            })
            ->distinct('patient_id')
            ->count('patient_id');

        $patientInQueue = ImagingOrder::whereIn('status', ['pending', 'scheduled'])
            ->distinct('patient_id')
            ->count('patient_id');

        $stats = [
            'sampleOrders'     => $orders,
            'processedSamples' => $processed,
            'patientsSeen'     => $patientsSeen,
            'patientsInQueue'  => $patientInQueue,
        ];

        // ── 2. Top modalities (last 30 days) ──────────────────────
        $topTests = ImagingOrder::where('created_at', '>=', Carbon::now()->subDays(30))
            ->whereNotNull('modality')
            ->where('modality', '!=', '')
            ->selectRaw('modality as name, COUNT(*) as count')
            ->groupBy('modality')
            ->orderByDesc('count')
            ->limit(4)
            ->get()
            ->map(fn($row) => [
                'name'  => $row->name,
                'count' => (int) $row->count,
            ])
            ->all();

        // ── 3. Queue ──────────────────────────────────────────────
        $statusMap = [
            'pending'     => 'waiting',
            'scheduled'   => 'processing',
            'in_progress' => 'processing',
        ];

        $queue = ImagingOrder::with(['patient', 'imagingResultFiles' => function ($query) {
            $query->where('file_type', 'image')->latest()->limit(1);
        }])
            ->whereIn('status', array_keys($statusMap))
            ->orderBy('ordered_date')
            ->limit(20)
            ->get()
            ->map(function (ImagingOrder $order) use ($statusMap, $defaultImage) {
                $patient     = $order->patient;
                $patientName = $patient?->name
                    ?? trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? ''))
                    ?: 'Unknown';

                $since = $order->scheduled_date
                    ? Carbon::parse($order->scheduled_date)
                    : Carbon::parse($order->ordered_date ?? $order->created_at ?? now());

                $latestFile = $order->imagingResultFiles->first();
                $thumbnailUrl = $latestFile && $latestFile->file_path
                    ? Storage::url($latestFile->file_path)
                    : $defaultImage;

                return [
                    'id'             => $order->id,
                    'patientCode'    => $order->order_number,
                    'name'           => $patientName,
                    'test'           => trim(($order->modality ?? '') . ' ' . ($order->body_part ?? ''))
                        ?: 'Imaging Study',
                    'waitingMinutes' => max(0, (int) $since->diffInMinutes(now())),
                    'status'         => $statusMap[$order->status] ?? 'waiting',
                    'thumbnailUrl'   => $thumbnailUrl,
                ];
            })
            ->all();

        // ── 4. Alerts (today) ─────────────────────────────────────
        $urgentPending = ImagingOrder::with('patient')
            ->where('priority', 'urgent')
            ->whereNotIn('status', ['reported', 'completed', 'cancelled'])
            ->orderByDesc('created_at')
            ->limit(25)
            ->get()
            ->map(fn(ImagingOrder $order) => [
                'id'          => $order->id,
                'patientCode' => $order->order_number,
                'name'        => $order->patient?->name
                    ?? trim(($order->patient?->first_name ?? '') . ' ' . ($order->patient?->last_name ?? ''))
                    ?: 'Unknown',
                'test'        => trim(($order->modality ?? '') . ' ' . ($order->body_part ?? ''))
                    ?: 'Imaging Study',
                'value'       => 'URGENT — awaiting report',
                'flag'        => 'elevated',
                'createdAt'   => Carbon::parse($order->created_at)->toIso8601String(),
            ])
            ->all();

        $amendedToday = ImagingOrder::with('patient')
            ->whereDate('amended_at', $today)
            ->orderByDesc('amended_at')
            ->limit(25)
            ->get()
            ->map(fn(ImagingOrder $order) => [
                'id'          => $order->id,
                'patientCode' => $order->order_number,
                'name'        => $order->patient?->name
                    ?? trim(($order->patient?->first_name ?? '') . ' ' . ($order->patient?->last_name ?? ''))
                    ?: 'Unknown',
                'test'        => trim(($order->modality ?? '') . ' ' . ($order->body_part ?? ''))
                    ?: 'Imaging Study',
                'value'       => 'Report amended',
                'flag'        => 'elevated',
                'createdAt'   => Carbon::parse($order->amended_at)->toIso8601String(),
            ])
            ->all();

        $alerts = collect($urgentPending)
            ->concat($amendedToday)
            ->sortByDesc('createdAt')
            ->values()
            ->all();

        // ── 5. Recent Scans ───────────────────────────────────────
        $recentScans = ImagingResultFile::with(['imagingOrder.patient'])
            ->where('is_removed', 0)
            ->where('file_type', 'image')
            ->orderByDesc('created_at')
            ->limit(4)
            ->get()
            ->map(function (ImagingResultFile $file) {
                $order = $file->imagingOrder;

                $modality = $order ? trim(($order->modality ?? '') . ' ' . ($order->body_part ?? '')) : 'Imaging Scan';

                return [
                    'id'          => $file->id,
                    'patientCode' => $order?->order_number ?? 'N/A',
                    'modality'    => $modality ?: 'Imaging Study',
                    'imageUrl'    => Storage::url($file->file_path),
                    'completedAt' => Carbon::parse($file->created_at)->toIso8601String(),
                ];
            })
            ->all();

        return response()->json([
            'stats'       => $stats,
            'topTests'    => $topTests,
            'queue'       => $queue,
            'alerts'      => $alerts,
            'recentScans' => $recentScans,
        ]);
    }

    /* ====================================================================== */
    /*                            LABORATORY                                  */
    /* ====================================================================== */

    public function laboratoryDashboard(int $departmentId)
    {
        $today = Carbon::today();

        $orders = LabOrder::whereDate('created_at', $today)
            ->where('status', 'pending')
            ->count();

        $processed = LabOrder::whereDate('created_at', $today)
            ->where('status', 'completed')
            ->count();

        $patientsSeen = PatientVisit::where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->where('status', 0)
            ->count();

        $patientInQueue = PatientVisit::where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->where('status', 1)
            ->count();

        $stats = [
            'sampleOrders'     => $orders,
            'processedSamples' => $processed,
            'patientsSeen'     => $patientsSeen,
            'patientsInQueue'  => $patientInQueue,
        ];

        $topTests = LabOrder::where('created_at', '>=', Carbon::now()->subDays(30))
            ->whereNotNull('test_name')
            ->where('test_name', '!=', '')
            ->selectRaw('test_name as name, COUNT(*) as count')
            ->groupBy('test_name')
            ->orderByDesc('count')
            ->limit(4)
            ->get()
            ->map(fn($row) => [
                'name'  => $row->name,
                'count' => (int) $row->count,
            ])
            ->all();

        $statusMap = [
            'pending'    => 'waiting',
            'collected'  => 'collecting',
            'processing' => 'processing',
        ];

        $queue = LabOrder::whereIn('status', array_keys($statusMap))
            ->orderBy('ordered_date')
            ->limit(20)
            ->get()
            ->map(function (LabOrder $order) use ($statusMap) {
                $patient = $order->patient;
                $patientName = $patient?->name ?? 'Unknown';

                $since = $order->collected_date
                    ? Carbon::parse($order->collected_date)
                    : Carbon::parse($order->ordered_date);

                return [
                    'id'             => $order->id,
                    'patientCode'    => $order->order_number,
                    'name'           => $patientName,
                    'test'           => $order->test_name,
                    'waitingMinutes' => max(0, (int) $since->diffInMinutes(now())),
                    'status'         => $statusMap[$order->status] ?? 'waiting',
                ];
            })
            ->all();

        $alerts = LabResultItem::query()
            ->join('lab_result_files', 'lab_result_files.id', '=', 'lab_result_items.lab_result_id')
            ->join('lab_orders', 'lab_orders.id', '=', 'lab_result_files.lab_order_id')
            ->whereDate('lab_result_items.created_at', $today)
            ->whereNotNull('lab_result_items.value_numeric')
            ->orderByDesc('lab_result_items.created_at')
            ->limit(50)
            ->get([
                'lab_result_items.id',
                'lab_result_items.test_name',
                'lab_result_items.value',
                'lab_result_items.value_numeric',
                'lab_result_items.unit',
                'lab_result_items.flag',
                'lab_result_items.ref_low',
                'lab_result_items.ref_high',
                'lab_result_items.created_at',
                'lab_orders.order_number',
                'lab_orders.patient_id',
            ])
            ->map(function ($item) {
                $flag = $item->flag;
                if (!$flag && $item->value_numeric !== null) {
                    if ($item->ref_low !== null && $item->value_numeric < $item->ref_low) {
                        $flag = 'L';
                    } elseif ($item->ref_high !== null && $item->value_numeric > $item->ref_high) {
                        $flag = 'H';
                    }
                }

                $uiFlag = in_array($flag, ['H', 'L', 'A'], true) ? 'elevated' : 'normal';

                $patient = \App\Models\Patients\Patient::find($item->patient_id);

                $cleanName = trim(preg_replace('/\s*\.+\s*$/', '', $item->test_name));

                $valueDisplay = $item->value
                    ?: ($item->value_numeric !== null
                        ? rtrim(rtrim(number_format($item->value_numeric, 3, '.', ''), '0'), '.')
                        : '—');

                if ($item->unit) {
                    $valueDisplay .= ' ' . $item->unit;
                }

                return [
                    'id'          => $item->id,
                    'patientCode' => $item->order_number,
                    'name'        => $patient?->name ?? 'Unknown',
                    'test'        => $cleanName,
                    'value'       => $valueDisplay,
                    'flag'        => $uiFlag,
                    'createdAt'   => Carbon::parse($item->created_at)->toIso8601String(),
                ];
            })
            ->all();

        return response()->json([
            'stats'    => $stats,
            'topTests' => $topTests,
            'queue'    => $queue,
            'alerts'   => $alerts,
        ]);
    }

    /* ====================================================================== */
    /*                            PHARMACY                                    */
    /*  All quantities are BASE UNITS (tablets/capsules). pack_size comes     */
    /*  from `products` and is only used for display ("17 packs + 6 loose").  */
    /* ====================================================================== */

    public function pharmacyDashboard(int $departmentId)
    {
        $today = Carbon::today();

        // ── 0. Probe so we can choose the right source ────────────
        $hasPostedLedger = DB::table('department_stock_ledger')
            ->where('department_id', $departmentId)
            ->where('status', 'posted')
            ->whereNull('deleted_at')
            ->exists();

        // ── 1. Stats ──────────────────────────────────────────────
        $prescriptions = Prescription::whereDate('created_at', $today)->count();

        if ($hasPostedLedger) {
            $productsDispensed = (float) DB::table('department_stock_ledger_items as i')
                ->join('department_stock_ledger as l', function ($j) {
                    $j->on('l.id', '=', 'i.ledger_id')
                        ->where('l.status', 'posted')
                        ->whereNull('l.deleted_at');
                })
                ->where('i.department_id', $departmentId)
                ->where('i.transaction_type', 'dispensation')
                ->whereDate('i.transaction_date', $today)
                ->sum('i.quantity_out');

            $patientsServed = DB::table('department_stock_ledger')
                ->where('department_id', $departmentId)
                ->where('transaction_type', 'dispensation')
                ->where('status', 'posted')
                ->whereDate('transaction_date', $today)
                ->distinct('patient_id')
                ->count('patient_id');
        } else {
            $productsDispensed = (float) PrescriptionItem::whereDate('dispensed_at', $today)
                ->where('dispensation_status', 'dispensed')
                ->sum('quantity_dispensed');

            $patientsServed = PrescriptionItem::whereDate('dispensed_at', $today)
                ->where('dispensation_status', 'dispensed')
                ->distinct('patient_id')
                ->count('patient_id');
        }

        $patientsInQueue = PrescriptionItem::where('dispensation_status', 'pending')
            ->where('is_active', 1)
            ->where('is_cancelled', 0)
            ->distinct('patient_id')
            ->count('patient_id');

        $stats = [
            'prescriptions'     => $prescriptions,
            'productsDispensed' => (int) round($productsDispensed), // total BASE UNITS
            'patientsServed'    => $patientsServed,
            'patientsInQueue'   => $patientsInQueue,
        ];

        // ── 2. Top drugs (last 30 days) ───────────────────────────
        if ($hasPostedLedger) {
            $topDrugs = DB::table('department_stock_ledger_items as i')
                ->join('department_stock_ledger as l', function ($j) {
                    $j->on('l.id', '=', 'i.ledger_id')
                        ->where('l.status', 'posted')
                        ->whereNull('l.deleted_at');
                })
                ->join('products as d', 'd.id', '=', 'i.drug_id')
                ->where('i.department_id', $departmentId)
                ->where('i.transaction_type', 'dispensation')
                ->where('i.transaction_date', '>=', now()->subDays(30))
                ->selectRaw('d.product_name as name, d.pack_size, SUM(i.quantity_out) as count')
                ->groupBy('i.drug_id', 'd.product_name', 'd.pack_size')
                ->orderByDesc('count')
                ->limit(4)
                ->get()
                ->map(fn($r) => [
                    'name'      => $r->name,
                    'count'     => (int) round($r->count),                         // base units
                    'packSize'  => max(1, (int) ($r->pack_size ?? 1)),
                    'display'   => $this->formatQty($r->count, $r->pack_size),     // "3 packs + 4 loose"
                ])
                ->all();
        } else {
            $topDrugs = PrescriptionItem::where('created_at', '>=', Carbon::now()->subDays(30))
                ->whereNotNull('drug_name')
                ->where('drug_name', '!=', '')
                ->where('is_cancelled', 0)
                ->selectRaw('drug_name as name, COUNT(*) as count')
                ->groupBy('drug_name')
                ->orderByDesc('count')
                ->limit(4)
                ->get()
                ->map(fn($row) => [
                    'name'     => $row->name,
                    'count'    => (int) $row->count,
                    'packSize' => 1,
                    'display'  => (string) $row->count,
                ])
                ->all();
        }

        // ── 3. Queue ──────────────────────────────────────────────
        $pendingItems = PrescriptionItem::with('patient')
            ->where('dispensation_status', 'pending')
            ->where('is_active', 1)
            ->where('is_cancelled', 0)
            ->whereDate('created_at', $today)
            ->orderBy('created_at')
            ->get();

        $queue = $pendingItems
            ->groupBy('patient_id')
            ->map(function ($items, $patientId) {
                $first   = $items->first();
                $patient = $first->patient;

                $drugNames = $items->pluck('drug_name')->filter()->unique()->values();

                $waiting = max(0, (int) Carbon::parse($first->created_at)->diffInMinutes(now()));

                $anyDispensed = $items->contains(fn($i) => $i->quantity_dispensed > 0);
                $allDispensed = $items->every(
                    fn($i) => $i->quantity_dispensed >= $i->quantity_prescribed
                );

                $status = match (true) {
                    $allDispensed => 'ready',
                    $anyDispensed => 'preparing',
                    default       => 'waiting',
                };

                return [
                    'id'             => (int) $patientId,
                    'patientCode'    => $first->visit_token ?? 'PHA-' . $patientId,
                    'name'           => $patient?->name
                        ?? trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? ''))
                        ?: 'Unknown',
                    'prescription'   => $drugNames->take(3)->implode(', ')
                        . ($drugNames->count() > 3 ? '…' : ''),
                    'waitingMinutes' => $waiting,
                    'status'         => $status,
                ];
            })
            ->sortByDesc('waitingMinutes')
            ->take(20)
            ->values()
            ->all();

        // ── 4. Alerts ─────────────────────────────────────────────

        // 4a. Stale queue
        $stale = PrescriptionItem::with('patient')
            ->where('dispensation_status', 'pending')
            ->where('is_active', 1)
            ->where('is_cancelled', 0)
            ->where('created_at', '<=', now()->subDay())
            ->where('created_at', '>=', now()->subDays(7))
            ->orderBy('created_at')
            ->limit(15)
            ->get()
            ->map(fn($item) => [
                'id'          => $item->id,
                'patientCode' => $item->visit_token ?? 'N/A',
                'name'        => $item->patient?->name ?? 'Unknown',
                'item'        => $item->drug_name ?? 'Unknown drug',
                'value'       => 'Pending > 24h',
                'flag'        => 'attention',
                'category'    => 'stale-queue',
                'createdAt'   => Carbon::parse($item->created_at)->toIso8601String(),
            ]);

        // 4b. Cancelled today
        $cancelled = PrescriptionItem::with('patient')
            ->where('is_cancelled', 1)
            ->whereDate('cancelled_at', $today)
            ->orderByDesc('cancelled_at')
            ->limit(15)
            ->get()
            ->map(fn($item) => [
                'id'          => $item->id,
                'patientCode' => $item->visit_token ?? 'N/A',
                'name'        => $item->patient?->name ?? 'Unknown',
                'item'        => $item->drug_name ?? 'Unknown drug',
                'value'       => $item->reason_not_dispensed ?: 'Cancelled',
                'flag'        => 'attention',
                'category'    => 'general',
                'createdAt'   => Carbon::parse($item->cancelled_at)->toIso8601String(),
            ]);

        // 4c. Dispensed today
        if ($hasPostedLedger) {
            $dispensed = DB::table('department_stock_ledger as l')
                ->join('department_stock_ledger_items as i', 'i.ledger_id', '=', 'l.id')
                ->join('products as d', 'd.id', '=', 'i.drug_id')
                ->leftJoin('patients as p', 'p.id', '=', 'l.patient_id')
                ->where('l.department_id', $departmentId)
                ->where('l.transaction_type', 'dispensation')
                ->where('l.status', 'posted')
                ->whereDate('l.transaction_date', $today)
                ->orderByDesc('l.transaction_date')
                ->limit(15)
                ->get([
                    'i.id',
                    'd.product_name as drug_name',
                    'd.pack_size',
                    'i.quantity_out',
                    'l.patient_id',
                    'l.reference_no',
                    'l.transaction_date',
                    'p.first_name as patient_name',
                ])
                ->map(fn($r) => [
                    'id'          => $r->id,
                    'patientCode' => $r->reference_no,
                    'name'        => $r->patient_name ?: 'Unknown',
                    'item'        => $r->drug_name,
                    'value'       => $this->formatQty($r->quantity_out, $r->pack_size) . ' dispensed',
                    'flag'        => 'completed',
                    'category'    => 'dispensed',
                    'createdAt'   => Carbon::parse($r->transaction_date)->toIso8601String(),
                ]);
        } else {
            $dispensed = PrescriptionItem::with('patient')
                ->whereDate('dispensed_at', $today)
                ->where('dispensation_status', 'dispensed')
                ->orderByDesc('dispensed_at')
                ->limit(15)
                ->get()
                ->map(fn($item) => [
                    'id'          => $item->id,
                    'patientCode' => $item->visit_token ?? 'N/A',
                    'name'        => $item->patient?->name ?? 'Unknown',
                    'item'        => $item->drug_name ?? 'Unknown drug',
                    'value'       => $item->quantity_dispensed . ' dispensed',
                    'flag'        => 'completed',
                    'category'    => 'dispensed',
                    'createdAt'   => Carbon::parse($item->dispensed_at)->toIso8601String(),
                ]);
        }

        // 4d. Expiring / expired batches
        $expiring = DB::table('v_department_expiring_drugs as v')
            ->join('products as d', 'd.id', '=', 'v.drug_id')
            ->where('v.department_id', $departmentId)
            ->whereIn('v.urgency', ['expired', 'within_30_days', 'within_60_days'])
            ->orderBy('v.expiry_date')
            ->limit(15)
            ->get(['v.*', 'd.product_name', 'd.pack_size'])
            ->map(fn($r) => [
                'id'          => null,
                'patientCode' => $r->batch_number,
                'name'        => 'Department stock',
                'item'        => $r->product_name,
                'value'       => $this->formatQty($r->quantity_on_hand, $r->pack_size)
                    . ', expires ' . Carbon::parse($r->expiry_date)->format('d M')
                    . " ({$r->days_to_expiry}d)",
                'flag'        => 'attention',
                'category'    => $r->urgency === 'expired' ? 'expired-removed' : 'expiring',
                'createdAt'   => Carbon::parse($r->expiry_date)->toIso8601String(),
            ]);

        // 4e. Low stock
        $lowStock = $this->lowStockAlerts($departmentId);

        // 4f. Combine
        $alerts = $stale
            ->concat($cancelled)
            ->concat($dispensed)
            ->concat($expiring)
            ->concat($lowStock)
            ->sortByDesc('createdAt')
            ->values()
            ->all();

        return response()->json([
            'stats'    => $stats,
            'topDrugs' => $topDrugs,
            'queue'    => $queue,
            'alerts'   => $alerts,
        ]);
    }

    /* ====================================================================== */
    /*                          MATERNAL & CHILD HEALTH                       */
    /* ====================================================================== */

    public function maternalChildHealthDashboard(int $departmentId)
    {
        $today = Carbon::today();

        $patientsSeen = PatientVisit::where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->where('status', 0)
            ->count();

        $patientsInQueue = PatientVisit::where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->where('status', 1)
            ->count();

        $appointmentsToday = PatientVisit::where('department_id', $departmentId)
            ->whereDate('appointment_date', $today)
            ->count();

        $ancVisits = $this->tableExists('maternal_care_records')
            ? DB::table('maternal_care_records')
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->count()
            : 0;

        $childHealthVisits = $this->tableExists('child_health_records')
            ? DB::table('child_health_records')
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->count()
            : 0;

        $stats = [
            'patientsSeen'      => $patientsSeen,
            'patientsInQueue'   => $patientsInQueue,
            'appointmentsToday' => $appointmentsToday,
            'ancVisits'         => $ancVisits,
            'childHealthVisits' => $childHealthVisits,
        ];

        $topServices = PatientVisit::where('department_id', $departmentId)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->whereNotNull('service_name')
            ->where('service_name', '!=', '')
            ->selectRaw('service_name as name, COUNT(*) as count')
            ->groupBy('service_name')
            ->orderByDesc('count')
            ->limit(4)
            ->get()
            ->map(fn($row) => [
                'name'  => $row->name,
                'count' => (int) $row->count,
            ])
            ->all();

        $statusMap = [
            1 => 'waiting',
            2 => 'processing',
        ];

        $queue = PatientVisit::with('patient')
            ->where('department_id', $departmentId)
            ->whereIn('status', array_keys($statusMap))
            ->whereDate('created_at', $today)
            ->orderBy('created_at')
            ->limit(20)
            ->get()
            ->map(function (PatientVisit $visit) use ($statusMap) {
                $patient = $visit->patient;

                return [
                    'id'             => $visit->id,
                    'patientCode'    => $visit->visit_token ?? 'MCH-' . $visit->id,
                    'name'           => $patient?->name
                        ?? trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? ''))
                        ?: 'Unknown',
                    'test'           => $visit->service_name ?? 'MCH Visit',
                    'waitingMinutes' => max(0, (int) Carbon::parse($visit->created_at)->diffInMinutes(now())),
                    'status'         => $statusMap[$visit->status] ?? 'waiting',
                ];
            })
            ->all();

        $highRisk = $this->tableExists('maternal_care_records')
            ? DB::table('maternal_care_records as m')
            ->leftJoin('patients as p', 'p.id', '=', 'm.patient_id')
            ->where('m.department_id', $departmentId)
            ->where('m.risk_level', 'high')
            ->whereDate('m.created_at', '>=', $today->copy()->subDays(7))
            ->orderByDesc('m.created_at')
            ->limit(15)
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'patientCode' => $r->visit_token ?? 'MCH-' . $r->id,
                'name'        => $r->patient_name
                    ?? trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? ''))
                    ?: 'Unknown',
                'test'        => 'High-risk pregnancy',
                'value'       => 'Needs review',
                'flag'        => 'elevated',
                'createdAt'   => Carbon::parse($r->created_at)->toIso8601String(),
            ])
            : collect();

        $overdueImmunizations = $this->tableExists('child_health_records')
            ? DB::table('child_health_records as c')
            ->leftJoin('patients as p', 'p.id', '=', 'c.patient_id')
            ->where('c.department_id', $departmentId)
            ->where('c.next_immunization_date', '<', $today)
            ->whereNull('c.next_immunization_completed_at')
            ->orderBy('c.next_immunization_date')
            ->limit(15)
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'patientCode' => 'IMM-' . $r->id,
                'name'        => $r->patient_name
                    ?? trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? ''))
                    ?: 'Unknown',
                'test'        => 'Overdue immunization',
                'value'       => 'Due ' . Carbon::parse($r->next_immunization_date)->format('d M'),
                'flag'        => 'attention',
                'createdAt'   => Carbon::parse($r->next_immunization_date)->toIso8601String(),
            ])
            : collect();

        $alerts = collect($highRisk)
            ->concat($overdueImmunizations)
            ->sortByDesc('createdAt')
            ->values()
            ->all();

        return response()->json([
            'stats'    => $stats,
            'topTests' => $topServices,
            'queue'    => $queue,
            'alerts'   => $alerts,
        ]);
    }

    /* ====================================================================== */
    /*                              THEATRE                                   */
    /* ====================================================================== */

    public function theatreDashboard(int $departmentId)
    {
        $today = Carbon::today();

        $hasSchedules = $this->tableExists('surgical_schedules');

        $scheduledToday = $hasSchedules
            ? DB::table('surgical_schedules')
            ->where('department_id', $departmentId)
            ->whereDate('scheduled_date', $today)
            ->count()
            : 0;

        $inProgress = $hasSchedules
            ? DB::table('surgical_schedules')
            ->where('department_id', $departmentId)
            ->where('status', 'in_progress')
            ->count()
            : 0;

        $completedToday = $hasSchedules
            ? DB::table('surgical_schedules')
            ->where('department_id', $departmentId)
            ->whereDate('completed_at', $today)
            ->where('status', 'completed')
            ->count()
            : 0;

        $cancelledToday = $hasSchedules
            ? DB::table('surgical_schedules')
            ->where('department_id', $departmentId)
            ->whereDate('updated_at', $today)
            ->where('status', 'cancelled')
            ->count()
            : 0;

        $stats = [
            'scheduledToday' => $scheduledToday,
            'inProgress'     => $inProgress,
            'completedToday' => $completedToday,
            'cancelledToday' => $cancelledToday,
        ];

        $topProcedures = $hasSchedules
            ? DB::table('surgical_schedules')
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->whereNotNull('procedure_name')
            ->where('procedure_name', '!=', '')
            ->selectRaw('procedure_name as name, COUNT(*) as count')
            ->groupBy('procedure_name')
            ->orderByDesc('count')
            ->limit(4)
            ->get()
            ->map(fn($row) => [
                'name'  => $row->name,
                'count' => (int) $row->count,
            ])
            ->all()
            : [];

        $statusMap = [
            'scheduled'   => 'waiting',
            'in_progress' => 'processing',
        ];

        $queue = $hasSchedules
            ? DB::table('surgical_schedules as s')
            ->leftJoin('patients as p', 'p.id', '=', 's.patient_id')
            ->leftJoin('theatres as t', 't.id', '=', 's.theatre_id')
            ->where('s.department_id', $departmentId)
            ->whereIn('s.status', array_keys($statusMap))
            ->whereDate('s.scheduled_date', $today)
            ->orderBy('s.scheduled_time')
            ->limit(20)
            ->get()
            ->map(fn($r) => [
                'id'             => $r->id,
                'patientCode'    => $r->schedule_token ?? 'THE-' . $r->id,
                'name'           => trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')) ?: 'Unknown',
                'test'           => $r->procedure_name ?? 'Surgery',
                'waitingMinutes' => max(0, (int) Carbon::parse(
                    $r->scheduled_date . ' ' . ($r->scheduled_time ?? '00:00')
                )->diffInMinutes(now())),
                'status'         => $statusMap[$r->status] ?? 'waiting',
                'theatre'        => $r->theatre_name ?? null,
            ])
            ->all()
            : [];

        $overdue = $hasSchedules
            ? DB::table('surgical_schedules as s')
            ->leftJoin('patients as p', 'p.id', '=', 's.patient_id')
            ->where('s.department_id', $departmentId)
            ->where('s.status', 'scheduled')
            ->whereDate('s.scheduled_date', '<=', $today)
            ->whereTime('s.scheduled_time', '<', now()->format('H:i:s'))
            ->orderBy('s.scheduled_time')
            ->limit(15)
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'patientCode' => $r->schedule_token ?? 'THE-' . $r->id,
                'name'        => trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')) ?: 'Unknown',
                'test'        => $r->procedure_name ?? 'Surgery',
                'value'       => 'Overdue start',
                'flag'        => 'elevated',
                'createdAt'   => Carbon::parse($r->scheduled_date . ' ' . ($r->scheduled_time ?? '00:00'))->toIso8601String(),
            ])
            : collect();

        $cancelled = $hasSchedules
            ? DB::table('surgical_schedules as s')
            ->leftJoin('patients as p', 'p.id', '=', 's.patient_id')
            ->where('s.department_id', $departmentId)
            ->whereDate('s.updated_at', $today)
            ->where('s.status', 'cancelled')
            ->orderByDesc('s.updated_at')
            ->limit(15)
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'patientCode' => $r->schedule_token ?? 'THE-' . $r->id,
                'name'        => trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')) ?: 'Unknown',
                'test'        => $r->procedure_name ?? 'Surgery',
                'value'       => $r->cancellation_reason ?: 'Cancelled',
                'flag'        => 'attention',
                'createdAt'   => Carbon::parse($r->updated_at)->toIso8601String(),
            ])
            : collect();

        $alerts = collect($overdue)
            ->concat($cancelled)
            ->sortByDesc('createdAt')
            ->values()
            ->all();

        return response()->json([
            'stats'    => $stats,
            'topTests' => $topProcedures,
            'queue'    => $queue,
            'alerts'   => $alerts,
        ]);
    }

    /* ====================================================================== */
    /*                               DENTAL                                   */
    /* ====================================================================== */

    public function dentalDashboard(int $departmentId)
    {
        $today = Carbon::today();

        $hasProcedures = $this->tableExists('dental_procedures');

        $patientsSeen = PatientVisit::where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->where('status', 0)
            ->count();

        $patientsInQueue = PatientVisit::where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->where('status', 1)
            ->count();

        $proceduresToday = $hasProcedures
            ? DB::table('dental_procedures')
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->count()
            : 0;

        $completedToday = $hasProcedures
            ? DB::table('dental_procedures')
            ->where('department_id', $departmentId)
            ->whereDate('completed_at', $today)
            ->where('status', 'completed')
            ->count()
            : 0;

        $stats = [
            'patientsSeen'    => $patientsSeen,
            'patientsInQueue' => $patientsInQueue,
            'proceduresToday' => $proceduresToday,
            'completedToday'  => $completedToday,
        ];

        $topProcedures = $hasProcedures
            ? DB::table('dental_procedures')
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->whereNotNull('procedure_name')
            ->where('procedure_name', '!=', '')
            ->selectRaw('procedure_name as name, COUNT(*) as count')
            ->groupBy('procedure_name')
            ->orderByDesc('count')
            ->limit(4)
            ->get()
            ->map(fn($row) => [
                'name'  => $row->name,
                'count' => (int) $row->count,
            ])
            ->all()
            : [];

        $statusMap = [
            1 => 'waiting',
            2 => 'processing',
        ];

        $queue = PatientVisit::with('patient')
            ->where('department_id', $departmentId)
            ->whereIn('status', array_keys($statusMap))
            ->whereDate('created_at', $today)
            ->orderBy('created_at')
            ->limit(20)
            ->get()
            ->map(function (PatientVisit $visit) use ($statusMap) {
                $patient = $visit->patient;

                return [
                    'id'             => $visit->id,
                    'patientCode'    => $visit->visit_token ?? 'DEN-' . $visit->id,
                    'name'           => $patient?->name
                        ?? trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? ''))
                        ?: 'Unknown',
                    'test'           => $visit->service_name ?? 'Dental Visit',
                    'waitingMinutes' => max(0, (int) Carbon::parse($visit->created_at)->diffInMinutes(now())),
                    'status'         => $statusMap[$visit->status] ?? 'waiting',
                ];
            })
            ->all();

        $followUps = $hasProcedures
            ? DB::table('dental_procedures as d')
            ->leftJoin('patients as p', 'p.id', '=', 'd.patient_id')
            ->where('d.department_id', $departmentId)
            ->whereNotNull('follow_up_date')
            ->whereDate('d.follow_up_date', '<=', $today->copy()->addDays(7))
            ->orderBy('d.follow_up_date')
            ->limit(15)
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'patientCode' => $r->procedure_token ?? 'DEN-' . $r->id,
                'name'        => trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')) ?: 'Unknown',
                'test'        => $r->procedure_name ?? 'Dental procedure',
                'value'       => 'Follow-up ' . Carbon::parse($r->follow_up_date)->format('d M'),
                'flag'        => 'attention',
                'createdAt'   => Carbon::parse($r->follow_up_date)->toIso8601String(),
            ])
            : collect();

        $cancelled = $hasProcedures
            ? DB::table('dental_procedures as d')
            ->leftJoin('patients as p', 'p.id', '=', 'd.patient_id')
            ->where('d.department_id', $departmentId)
            ->whereDate('d.updated_at', $today)
            ->where('d.status', 'cancelled')
            ->orderByDesc('d.updated_at')
            ->limit(15)
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'patientCode' => $r->procedure_token ?? 'DEN-' . $r->id,
                'name'        => trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')) ?: 'Unknown',
                'test'        => $r->procedure_name ?? 'Dental procedure',
                'value'       => $r->cancellation_reason ?: 'Cancelled',
                'flag'        => 'attention',
                'createdAt'   => Carbon::parse($r->updated_at)->toIso8601String(),
            ])
            : collect();

        $alerts = collect($followUps)
            ->concat($cancelled)
            ->sortByDesc('createdAt')
            ->values()
            ->all();

        return response()->json([
            'stats'    => $stats,
            'topTests' => $topProcedures,
            'queue'    => $queue,
            'alerts'   => $alerts,
        ]);
    }

    /* ====================================================================== */
    /*                            OPHTHALMOLOGY                               */
    /* ====================================================================== */

    public function ophthalmologyDashboard(int $departmentId)
    {
        $today = Carbon::today();

        $hasExams      = $this->tableExists('eye_examinations');
        $hasProcedures = $this->tableExists('ophthalmology_procedures');

        $patientsSeen = PatientVisit::where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->where('status', 0)
            ->count();

        $patientsInQueue = PatientVisit::where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->where('status', 1)
            ->count();

        $examsToday = $hasExams
            ? DB::table('eye_examinations')
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->count()
            : 0;

        $proceduresToday = $hasProcedures
            ? DB::table('ophthalmology_procedures')
            ->where('department_id', $departmentId)
            ->whereDate('created_at', $today)
            ->count()
            : 0;

        $stats = [
            'patientsSeen'    => $patientsSeen,
            'patientsInQueue' => $patientsInQueue,
            'examsToday'      => $examsToday,
            'proceduresToday' => $proceduresToday,
        ];

        $topProcedures = $hasProcedures
            ? DB::table('ophthalmology_procedures')
            ->where('department_id', $departmentId)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->whereNotNull('procedure_name')
            ->where('procedure_name', '!=', '')
            ->selectRaw('procedure_name as name, COUNT(*) as count')
            ->groupBy('procedure_name')
            ->orderByDesc('count')
            ->limit(4)
            ->get()
            ->map(fn($row) => [
                'name'  => $row->name,
                'count' => (int) $row->count,
            ])
            ->all()
            : [];

        $statusMap = [
            1 => 'waiting',
            2 => 'processing',
        ];

        $queue = PatientVisit::with('patient')
            ->where('department_id', $departmentId)
            ->whereIn('status', array_keys($statusMap))
            ->whereDate('created_at', $today)
            ->orderBy('created_at')
            ->limit(20)
            ->get()
            ->map(function (PatientVisit $visit) use ($statusMap) {
                $patient = $visit->patient;

                return [
                    'id'             => $visit->id,
                    'patientCode'    => $visit->visit_token ?? 'OPH-' . $visit->id,
                    'name'           => $patient?->name
                        ?? trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? ''))
                        ?: 'Unknown',
                    'test'           => $visit->service_name ?? 'Eye Examination',
                    'waitingMinutes' => max(0, (int) Carbon::parse($visit->created_at)->diffInMinutes(now())),
                    'status'         => $statusMap[$visit->status] ?? 'waiting',
                ];
            })
            ->all();

        $urgentReferrals = $hasExams
            ? DB::table('eye_examinations as e')
            ->leftJoin('patients as p', 'p.id', '=', 'e.patient_id')
            ->where('e.department_id', $departmentId)
            ->where('e.urgency', 'urgent')
            ->whereDate('e.created_at', '>=', $today->copy()->subDays(7))
            ->orderByDesc('e.created_at')
            ->limit(15)
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'patientCode' => $r->exam_token ?? 'OPH-' . $r->id,
                'name'        => trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')) ?: 'Unknown',
                'test'        => 'Urgent referral',
                'value'       => 'Needs specialist review',
                'flag'        => 'elevated',
                'createdAt'   => Carbon::parse($r->created_at)->toIso8601String(),
            ])
            : collect();

        $postOpFollowUps = $hasProcedures
            ? DB::table('ophthalmology_procedures as o')
            ->leftJoin('patients as p', 'p.id', '=', 'o.patient_id')
            ->where('o.department_id', $departmentId)
            ->whereNotNull('follow_up_date')
            ->whereDate('o.follow_up_date', '<=', $today->copy()->addDays(7))
            ->orderBy('o.follow_up_date')
            ->limit(15)
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'patientCode' => $r->procedure_token ?? 'OPH-' . $r->id,
                'name'        => trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')) ?: 'Unknown',
                'test'        => $r->procedure_name ?? 'Post-op follow-up',
                'value'       => 'Follow-up ' . Carbon::parse($r->follow_up_date)->format('d M'),
                'flag'        => 'attention',
                'createdAt'   => Carbon::parse($r->follow_up_date)->toIso8601String(),
            ])
            : collect();

        $alerts = collect($urgentReferrals)
            ->concat($postOpFollowUps)
            ->sortByDesc('createdAt')
            ->values()
            ->all();

        return response()->json([
            'stats'    => $stats,
            'topTests' => $topProcedures,
            'queue'    => $queue,
            'alerts'   => $alerts,
        ]);
    }

    /* ====================================================================== */
    /*                                HELPERS                                 */
    /* ====================================================================== */

    /**
     * Low-stock alerts for a department (quantities in BASE UNITS,
     * displayed as packs + loose). Prefers department_reorder_levels;
     * falls back to days_of_stock_left.
     */
    private function lowStockAlerts(int $departmentId)
    {
        $hasReorderTable = DB::getSchemaBuilder()
            ->hasTable('department_reorder_levels');

        if ($hasReorderTable) {
            return DB::table('v_department_stock_balance as sb')
                ->join('department_reorder_levels as rl', function ($j) {
                    $j->on('rl.department_id', '=', 'sb.department_id')
                        ->on('rl.drug_id', '=', 'sb.drug_id');
                })
                ->join('products as d', 'd.id', '=', 'sb.drug_id')
                ->where('sb.department_id', $departmentId)
                ->whereColumn('sb.quantity_on_hand', '<=', 'rl.reorder_level')
                ->orderByRaw('sb.quantity_on_hand / NULLIF(rl.reorder_level, 0)')
                ->limit(15)
                ->get([
                    'sb.quantity_on_hand',
                    'rl.reorder_level',
                    'd.product_name',
                    'd.pack_size',
                ])
                ->map(fn($r) => [
                    'id'          => null,
                    'patientCode' => 'STOCK',
                    'name'        => 'Department stock',
                    'item'        => $r->product_name,
                    'value'       => $this->formatQty($r->quantity_on_hand, $r->pack_size)
                        . ' left (reorder at ' . $this->formatQty($r->reorder_level, $r->pack_size) . ')',
                    'flag'        => 'attention',
                    'category'    => 'low-stock',
                    'createdAt'   => now()->toIso8601String(),
                ]);
        }

        return DB::table('v_department_drug_movement as m')
            ->join('products as d', 'd.id', '=', 'm.drug_id')
            ->where('m.department_id', $departmentId)
            ->whereIn('m.movement_class', ['fast', 'medium'])
            ->whereNotNull('m.days_of_stock_left')
            ->where('m.days_of_stock_left', '<', 14)
            ->orderBy('m.days_of_stock_left')
            ->limit(15)
            ->get([
                'm.quantity_on_hand',
                'm.days_of_stock_left',
                'd.product_name',
                'd.pack_size',
            ])
            ->map(fn($r) => [
                'id'          => null,
                'patientCode' => 'STOCK',
                'name'        => 'Department stock',
                'item'        => $r->product_name,
                'value'       => $this->formatQty($r->quantity_on_hand, $r->pack_size)
                    . ", ~{$r->days_of_stock_left} days at current rate",
                'flag'        => 'attention',
                'category'    => 'low-stock',
                'createdAt'   => now()->toIso8601String(),
            ]);
    }

    /**
     * Base units -> "17 packs + 6 loose". Products with no pack_size
     * (null/0/1) show plain units, e.g. "14 units".
     */
    private function formatQty($units, $packSize): string
    {
        $units = (int) round((float) $units);
        $size  = max(1, (int) $packSize);

        if ($size <= 1) {
            return number_format($units) . ' units';
        }

        $sign  = $units < 0 ? -1 : 1;
        $packs = $sign * intdiv(abs($units), $size);
        $loose = abs($units) % $size;

        $parts = [];
        if ($packs !== 0) {
            $parts[] = number_format($packs) . (abs($packs) === 1 ? ' pack' : ' packs');
        }
        if ($loose !== 0) {
            $parts[] = $loose . ' loose';
        }

        return $parts ? implode(' + ', $parts) : '0';
    }

    private function drugName(int $drugId): string
    {
        return DB::table('products')->where('id', $drugId)->value('product_name') ?? 'Unknown';
    }

    /**
     * Guard so the dashboard doesn't 500 when a domain-specific table
     * hasn't been migrated yet.
     */
    private function tableExists(string $table): bool
    {
        return DB::getSchemaBuilder()->hasTable($table);
    }
}