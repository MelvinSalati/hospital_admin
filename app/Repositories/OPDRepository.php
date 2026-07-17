<?php


namespace App\Repositories;

use Illuminate\Support\Facades\DB;

class OPDRepository extends BaseRepository
{
    protected function setTable(): void
    {
        $this->table = 'opd_registrations';
    }

    /**
     * Get OPD patients with related data
     */
    public function getOPDList(array $filters = [], $perPage = 15)
    {
        $query = DB::table('opd_registrations as o')
            ->join('patients as p', 'o.patient_id', '=', 'p.id')
            ->join('users as d', 'o.doctor_id', '=', 'd.id')
            ->leftJoin('appointments as a', 'o.appointment_id', '=', 'a.id')
            ->whereNull('o.deleted_at')
            ->whereNull('p.deleted_at')
            ->select(
                'o.*',
                'p.id as patient_id',
                'p.patient_number',
                'p.first_name as patient_first_name',
                'p.last_name as patient_last_name',
                'p.email as patient_email',
                'p.phone as patient_phone',
                'p.profile_image as patient_image',
                'd.id as doctor_id',
                'd.first_name as doctor_first_name',
                'd.last_name as doctor_last_name',
                'a.appointment_number',
                'a.appointment_time'
            );

        // Apply filters
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('o.opd_number', 'like', "%{$search}%")
                    ->orWhere('p.first_name', 'like', "%{$search}%")
                    ->orWhere('p.last_name', 'like', "%{$search}%")
                    ->orWhere('p.email', 'like', "%{$search}%")
                    ->orWhere('p.patient_number', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['doctor_id'])) {
            $query->where('o.doctor_id', $filters['doctor_id']);
        }

        if (!empty($filters['payment_mode'])) {
            $query->where('o.payment_mode', $filters['payment_mode']);
        }

        if (!empty($filters['status'])) {
            $query->where('o.status', $filters['status']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('o.registration_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('o.registration_date', '<=', $filters['date_to']);
        }

        if (!empty($filters['today'])) {
            $query->whereDate('o.registration_date', today());
        }

        // Order by
        $orderBy = $filters['order_by'] ?? 'o.registration_date';
        $orderDir = $filters['order_dir'] ?? 'desc';
        $query->orderBy($orderBy, $orderDir);

        // Paginate
        $page = request()->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $total = $query->count();

        $data = $query->offset($offset)
            ->limit($perPage)
            ->get();

        // Format data
        $formattedData = $data->map(function ($item) {
            return [
                'id' => $item->id,
                'opd_number' => $item->opd_number,
                'opd_no' => $item->opd_number,
                'patient' => [
                    'id' => $item->patient_id,
                    'patient_number' => $item->patient_number,
                    'name' => trim($item->patient_first_name . ' ' . $item->patient_last_name),
                    'first_name' => $item->patient_first_name,
                    'last_name' => $item->patient_last_name,
                    'email' => $item->patient_email,
                    'phone' => $item->patient_phone,
                    'image' => $this->getProfileImageUrl($item->patient_image, $item->patient_first_name, $item->patient_last_name),
                    'initials' => $this->getInitials($item->patient_first_name, $item->patient_last_name)
                ],
                'doctor' => [
                    'id' => $item->doctor_id,
                    'name' => trim($item->doctor_first_name . ' ' . $item->doctor_last_name)
                ],
                'appointment' => [
                    'date' => $item->registration_date,
                    'time' => $item->registration_time ?? $item->appointment_time,
                    'formatted_date' => date('jS F Y', strtotime($item->registration_date)),
                    'formatted_time' => $item->registration_time ? date('h:i A', strtotime($item->registration_time)) : '--:--',
                    'display' => $this->formatAppointmentDisplay($item)
                ],
                'standard_charge' => $item->standard_charge,
                'formatted_charge' => '$' . number_format($item->standard_charge, 2),
                'payment_mode' => $item->payment_mode,
                'total_visits' => $this->getPatientVisitCount($item->patient_id),
                'status' => $item->status,
                'status_badge' => $this->getStatusBadge($item->status),
                'created_at' => $item->created_at,
                'actions' => [
                    'view' => "/opd/{$item->id}",
                    'edit' => "/opd/{$item->id}/edit",
                    'delete' => "/opd/{$item->id}"
                ]
            ];
        });

        return [
            'data' => $formattedData,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => (int)$page,
                'last_page' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total)
            ]
        ];
    }

    /**
     * Get OPD statistics
     */
    public function getStatistics($period = 'today')
    {
        $query = DB::table('opd_registrations')->whereNull('deleted_at');

        switch ($period) {
            case 'today':
                $query->whereDate('created_at', today());
                break;
            case 'week':
                $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'month':
                $query->whereMonth('created_at', now()->month);
                break;
            case 'year':
                $query->whereYear('created_at', now()->year);
                break;
        }

        $totalPatients = (clone $query)->count();
        $totalRevenue = (clone $query)->sum('standard_charge');
        $avgCharge = (clone $query)->avg('standard_charge');

        $paymentModeStats = DB::table('opd_registrations')
            ->select('payment_mode', DB::raw('count(*) as count'), DB::raw('sum(standard_charge) as total'))
            ->whereNull('deleted_at')
            ->when($period === 'today', function ($q) {
                return $q->whereDate('created_at', today());
            })
            ->when($period === 'week', function ($q) {
                return $q->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
            })
            ->when($period === 'month', function ($q) {
                return $q->whereMonth('created_at', now()->month);
            })
            ->groupBy('payment_mode')
            ->get();

        $statusStats = DB::table('opd_registrations')
            ->select('status', DB::raw('count(*) as count'))
            ->whereNull('deleted_at')
            ->when($period === 'today', function ($q) {
                return $q->whereDate('created_at', today());
            })
            ->groupBy('status')
            ->get();

        $todayAppointments = DB::table('opd_registrations')
            ->whereDate('registration_date', today())
            ->count();

        $upcomingAppointments = DB::table('opd_registrations')
            ->whereDate('registration_date', '>', today())
            ->count();

        return [
            'total_patients' => $totalPatients,
            'total_revenue' => $totalRevenue,
            'average_charge' => round($avgCharge, 2),
            'today_appointments' => $todayAppointments,
            'upcoming_appointments' => $upcomingAppointments,
            'by_payment_mode' => $paymentModeStats,
            'by_status' => $statusStats
        ];
    }

    /**
     * Create OPD registration with transaction
     */
    public function createOPD(array $data)
    {
        try {
            $this->beginTransaction();

            // Generate OPD number
            $opdNumber = $this->generateOPDNumber();

            // Get patient info
            $patient = DB::table('patients')->find($data['patient_id']);

            // Get doctor info
            $doctor = DB::table('users')->find($data['doctor_id']);

            // Calculate visit sequence
            $visitSequence = DB::table('opd_registrations')
                ->where('patient_id', $data['patient_id'])
                ->count() + 1;

            // Create OPD registration
            $opdData = [
                'opd_number' => $opdNumber,
                'patient_id' => $data['patient_id'],
                'doctor_id' => $data['doctor_id'],
                'appointment_id' => $data['appointment_id'] ?? null,
                'registration_date' => $data['registration_date'] ?? today(),
                'registration_time' => $data['registration_time'] ?? now()->format('H:i:s'),
                'visit_type' => $data['visit_type'] ?? 'first_visit',
                'visit_sequence' => $visitSequence,
                'complaints' => $data['complaints'] ?? null,
                'symptoms' => $data['symptoms'] ?? null,
                'payment_mode' => $data['payment_mode'],
                'standard_charge' => $data['standard_charge'],
                'discount_amount' => $data['discount_amount'] ?? 0,
                'total_charge' => $data['standard_charge'] - ($data['discount_amount'] ?? 0),
                'paid_amount' => $data['paid_amount'] ?? 0,
                'due_amount' => ($data['standard_charge'] - ($data['discount_amount'] ?? 0)) - ($data['paid_amount'] ?? 0),
                'payment_status' => $this->determinePaymentStatus($data),
                'status' => 'pending',
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ];

            $id = DB::table('opd_registrations')->insertGetId($opdData);

            // Create bill if payment received
            if (($data['paid_amount'] ?? 0) > 0) {
                $this->createBillForOPD($id, $opdData);
            }

            $this->commit();

            return $this->find($id);
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Generate unique OPD number
     */
    private function generateOPDNumber(): string
    {
        $year = date('Y');
        $month = date('m');

        $lastOPD = DB::table('opd_registrations')
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastOPD) {
            $lastNumber = intval(substr($lastOPD->opd_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return 'OPD' . $year . $month . $newNumber;
    }

    /**
     * Determine payment status
     */
    private function determinePaymentStatus($data): string
    {
        $total = $data['standard_charge'] - ($data['discount_amount'] ?? 0);
        $paid = $data['paid_amount'] ?? 0;

        if ($paid >= $total) {
            return 'paid';
        } elseif ($paid > 0) {
            return 'partial';
        }
        return 'pending';
    }

    /**
     * Create bill for OPD registration
     */
    private function createBillForOPD($opdId, $opdData)
    {
        $billNumber = 'BILL' . date('Ymd') . str_pad(DB::table('bills')->count() + 1, 4, '0', STR_PAD_LEFT);

        $billId = DB::table('bills')->insertGetId([
            'bill_number' => $billNumber,
            'patient_id' => $opdData['patient_id'],
            'billable_type' => 'opd_registration',
            'billable_id' => $opdId,
            'bill_date' => today(),
            'subtotal' => $opdData['standard_charge'],
            'discount_amount' => $opdData['discount_amount'],
            'total_amount' => $opdData['total_charge'],
            'paid_amount' => $opdData['paid_amount'],
            'due_amount' => $opdData['due_amount'],
            'payment_status' => $opdData['payment_status'],
            'payment_mode' => $opdData['payment_mode'],
            'created_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Create bill item
        DB::table('bill_items')->insert([
            'bill_id' => $billId,
            'item_name' => 'OPD Consultation',
            'description' => 'OPD Registration Fee',
            'quantity' => 1,
            'unit_price' => $opdData['standard_charge'],
            'total' => $opdData['standard_charge'],
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Create payment record
        if ($opdData['paid_amount'] > 0) {
            DB::table('payments')->insert([
                'payment_number' => 'PAY' . date('Ymd') . str_pad(DB::table('payments')->count() + 1, 4, '0', STR_PAD_LEFT),
                'bill_id' => $billId,
                'patient_id' => $opdData['patient_id'],
                'payment_date' => today(),
                'amount' => $opdData['paid_amount'],
                'payment_method' => $opdData['payment_mode'],
                'status' => 'completed',
                'received_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }
    }

    /**
     * Get patient visit count
     */
    private function getPatientVisitCount($patientId): int
    {
        return DB::table('opd_registrations')
            ->where('patient_id', $patientId)
            ->count();
    }

    /**
     * Format appointment display
     */
    private function formatAppointmentDisplay($item): string
    {
        $time = $item->registration_time
            ? date('h:i A', strtotime($item->registration_time))
            : ($item->appointment_time ? date('h:i A', strtotime($item->appointment_time)) : '--:--');

        $date = date('jS F Y', strtotime($item->registration_date));

        return $time . ' ' . $date;
    }

    /**
     * Get profile image URL
     */
    private function getProfileImageUrl($image, $firstName, $lastName): string
    {
        if ($image) {
            return asset('storage/' . $image);
        }

        $name = urlencode(trim($firstName . ' ' . $lastName));
        return "https://ui-avatars.com/api/?name={$name}&background=4f46e5&color=fff";
    }

    /**
     * Get initials from name
     */
    private function getInitials($firstName, $lastName): string
    {
        if ($lastName) {
            return strtoupper(substr($firstName, 0, 1) . substr($lastName, 0, 1));
        }
        return strtoupper(substr($firstName, 0, 2));
    }

    /**
     * Get status badge
     */
    private function getStatusBadge($status): array
    {
        $badges = [
            'pending' => ['label' => 'Pending', 'color' => 'yellow'],
            'checked_in' => ['label' => 'Checked In', 'color' => 'blue'],
            'with_doctor' => ['label' => 'With Doctor', 'color' => 'purple'],
            'completed' => ['label' => 'Completed', 'color' => 'green'],
            'cancelled' => ['label' => 'Cancelled', 'color' => 'red'],
            'no_show' => ['label' => 'No Show', 'color' => 'gray']
        ];

        return $badges[$status] ?? ['label' => ucfirst($status), 'color' => 'gray'];
    }
}
