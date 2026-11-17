<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PatientVisit;
use App\Services\Receptions\ReceptionService;
use Inertia\Inertia;

class ReceptionController extends Controller
{
    protected ReceptionService $receptionService;

    public function __construct(ReceptionService $service)
    {
        $this->receptionService     = $service;
    }
    public function dashboard(ReceptionService $service, string $departmentId)
    {
        $id  = (int) $departmentId;
        return Inertia::render('receptions/dashboard', $service->dashboard($id));
    }
    /**
     *  renders the dashbiard  specifically dashboard page
     */
    public function index()
    {
        // return  Inertia::render('receptions/dashboard', $this->receptionService->getDashboard());
    }

    public function search()
    {
        return  Inertia::render('receptions/registry');
    }
    public function appointments()
    {
        return Inertia::render('receptions/appointments', [
            'appointments' => \App\Models\Appointments\Appointment::query()
                ->join(
                    'patients',
                    'patients.id',
                    '=',
                    'appointments.patient_id'
                )
                ->join(
                    'user_profiles',
                    'user_profiles.user_id',
                    '=',
                    'appointments.doctor_id'
                )
                ->select([
                    'appointments.*',

                    'patients.first_name as patient_first_name',
                    'patients.last_name as patient_last_name',

                    'user_profiles.first_name as doctor_first_name',
                    'user_profiles.surname as doctor_last_name',
                ])
                ->get(),

            'transactions' => [],
            'queue' => [],
        ]);
    }
    public function visits(int $departmentId)
    {
        $queue = PatientVisit::with([
            'patient',
            'assignedStaff',
            'assignedDepartment',   // eager load, avoids an N+1 query per row
            'visitToken',
        ])
            ->where('department_id', $departmentId)
            ->whereIn('status', [0, 1])   // 1 = In Progress, 0 = Completed
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($visit) {
                return [
                    'id'                      => $visit->id,
                    'token'                   => $visit->visitToken?->token
                        ?? 'T-' . str_pad($visit->id, 4, '0', STR_PAD_LEFT),
                    'visit_token_id'          => $visit->visitToken?->id,
                    'patient_id'              => $visit->patient_id,
                    'patient_number'          => $visit->patient?->patient_number,
                    'patient_name'            => $visit->patient
                        ? trim($visit->patient->first_name . ' ' . $visit->patient->last_name)
                        : 'Unknown',
                    'contact'                 => $visit->patient?->phone ?? 'N/A',
                    'gender'                  => $visit->patient?->gender ?? 'N/A',
                    'payment_method'          => $visit->payment_method,
                    'original_payment_method' => $visit->visitToken?->original_payment_method
                        ?? $visit->original_payment_method,

                    // The frontend splits the tabs on this: 1 = In Progress, 0 = Completed
                    'status'                  => (int) $visit->status,

                    'registered_at'           => ($visit->started_at ?? $visit->created_at)?->format('Y-m-d H:i:s'),
                    'assigned_department'     => $visit->assignedDepartment?->department_name ?? 'Not assigned',
                    'assigned_staff'          => $visit->assignedStaff?->name ?? 'Not assigned',
                    'priority'                => $visit->priority ?? 'routine',
                    'department_id'           => $visit->department_id,
                ];
            });

        return Inertia::render('receptions/visits', [
            'queue' => $queue,
        ]);
    }
    public function queues()
    {
        return Inertia::render('receptions/queues', [
            'active' => PatientVisit::with('patient')->where('status', 0)->where('department_id', 10)->get(),
        ]);
    }

    public function bills()
    {
        return Inertia::render('receptions/bills', [
            'completed'   => [],
            'pending'     => [],
            'weekly'      => []
        ]);
    }

    public function registry()
    {
        return Inertia::render('receptions/registry');
    }
    public function addPatient()
    {
        return Inertia::render('receptions/create');
    }
    // public function dashboard()
    // {
    //     return Inertia::render('receptions/bills');
    // }

    public function reports()
    {
        return Inertia::render('receptions/bills');
    }

    public function newPatient()
    {
        return Inertia::render('receptions/patient');
    }
}
