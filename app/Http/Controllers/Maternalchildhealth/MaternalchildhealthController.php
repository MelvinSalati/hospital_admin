<?php

namespace App\Http\Controllers\Maternalchildhealth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PatientVisit;
use App\Repositories\Appointments\AppointmentRepository;
use Inertia\Inertia;

class MaternalchildhealthController extends Controller
{
    public function appointments(int $departmentId)
    {
        return Inertia::render('martenal/appointments', [
            'appointments' => AppointmentRepository::getAppointments($departmentId)
        ]);
    }

    public function queue($departmentId)
    {
        // Get all active visit tokens with patient and visit information
        $queuedPatients = PatientVisit::with(['patient', 'assignedStaff', 'visitToken'])
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
        return Inertia::render('martenal/queue', [
            'queue' => $queuedPatients
        ]);
    }

    private function mapVisitStatus($status)
    {
        $statusMap = [
            0 => 'cancelled',
            1 => 'active',
            2 => 'pending',
            3 => 'in_progress',
            4 => 'completed',
        ];

        return $statusMap[$status] ?? 'pending';
    }

    public function processed()
    {
        $orders = PatientVisit::query()
            ->with('patient')
            ->where('status', 1)
            ->where('department_id', 7)
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('martenal/processed', [
            'radiologyQueue' => $orders,
        ]);
    }
}
