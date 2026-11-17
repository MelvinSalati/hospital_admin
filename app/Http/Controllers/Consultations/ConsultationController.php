<?php

namespace App\Http\Controllers\Consultations;

use App\Http\Controllers\Controller;
use App\Models\Appointments\Appointment;
use App\Models\Departments\Department;
use App\Models\PatientVisit;
use App\Services\AppointmentService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use App\Models\Patients\VisitToken;
use Illuminate\Support\Facades\Log;
use App\Services\Consultation\ConsultationDashboardService;

class ConsultationController extends Controller
{
    protected AppointmentService $appointmentService;
    protected ConsultationDashboardService $service;

    public function __construct(AppointmentService $appointmentService, ConsultationDashboardService $service)
    {
        $this->appointmentService = $appointmentService;
        $this->service = $service;
    }

    public function dashboard(int $departmentId)
    {
        return Inertia::render('consultations/dashboard', $this->service->getDashboardData($departmentId));
    }

    public function queue(int $departmentId)
    {
        $base = fn() => PatientVisit::where('department_id', $departmentId);

        $with = ['patient', 'assignedDepartment', 'assignedStaff', 'visitToken'];

        // In Progress: status 1 (the patient is still in the queue)
        $inProgress = $base()
            ->with($with)
            ->where('status', 1)
            ->orderBy('created_at', 'asc')
            ->get();

        // Seen: anything that is not status 1 (status 0 = out of the queue).
        // Capped to the latest 200 so the payload stays small.
        $seen = $base()
            ->with($with)
            ->where(function ($q) {
                $q->where('status', '!=', 1)->orWhereNull('status');
            })
            ->orderByDesc('updated_at')
            ->limit(200)
            ->get();

        $queue = $inProgress->concat($seen)
            ->map(function ($visit) {
                $isInProgress = (int) $visit->status === 1;

                return [
                    'id' => $visit->id,
                    'token' => $visit->visitToken?->token ?? $visit->visit_token,
                    'visit_token_id' => $visit->visitToken?->id,
                    'patient_id' => $visit->patient_id,
                    'patient_number' => $visit->patient?->patient_number,
                    'patient_name' => $visit->patient
                        ? $visit->patient->first_name . ' ' . $visit->patient->last_name
                        : 'Unknown',
                    'contact' => $visit->patient?->phone ?? 'N/A',
                    'gender' => $visit->patient?->gender ?? 'N/A',
                    'payment_method' => $visit->payment_method,
                    'original_payment_method' => $visit->visitToken?->original_payment_method
                        ?? $visit->original_payment_method,
                    'status' => $isInProgress ? 1 : 0,
                    'visit_status' => $isInProgress ? 'in_progress' : 'completed',
                    'registered_at' => ($visit->started_at ?? $visit->created_at)
                        ->format('Y-m-d H:i:s'),
                    'assigned_department' => $visit->assignedDepartment?->department_name ?? 'Not assigned',
                    'assigned_staff' => $visit->assignedStaff?->name ?? 'Not assigned',
                    'priority' => $visit->priority ?? 'routine',
                    'department_id' => $visit->department_id,
                ];
            })
            ->values();

        $stats = [
            'total_in_queue' => $inProgress->count(),
            'pending_assignment' => $base()->where('status', 1)->whereNull('to_queue')->count(),
            'assigned_today' => $base()->whereDate('created_at', today())->where('status', 1)->count(),
        ];

        return Inertia::render('consultations/queue', [
            'queue' => $queue,
            'stats' => $stats,
        ]);
    }

    // Helper method to map status codes to readable strings
    private function mapVisitStatus($status)
    {
        return match ($status) {
            1 => 'queued',
            2 => 'in_progress',
            3 => 'completed',
            4 => 'cancelled',
            default => 'pending'
        };
    }
    /**
     * Assign patient to a specific nurse/staff
     */
    public function assignToNurse(Request $request, $tokenId)
    {
        $request->validate([
            'staff_id' => 'required|exists:users,id',
            'department_id' => 'required|exists:departments,id',
        ]);

        try {
            $token = VisitToken::findOrFail($tokenId);

            $token->update([
                'assigned_staff_id' => $request->staff_id,
                'assigned_department_id' => $request->department_id,
            ]);

            // Create a patient visit record
            $visit = PatientVisit::create([
                'patient_id' => $token->patient_id,
                'visit_token' => $token->token,
                'department_id' => $request->department_id,
                'assigned_to' => $request->staff_id,
                'status' => 'pending',
                'priority' => 'routine',
                'started_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Patient assigned successfully',
                'data' => $visit
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to assign patient',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Display a listing of the resource.
     */


//     public function queue()
//     {
//         // Debug: Log authentication information
//         Log::info('Queue accessed by user:', [
//             'user_id' => Auth::id(),
//             'user' => Auth::user(),
//             'is_authenticated' => Auth::check(),
//             'guard' => Auth::getDefaultDriver()
//         ]);

//         $userId = Auth::id();

//         // If no user is authenticated, return empty array
//         if (!$userId) {
//             Log::warning('No authenticated user found in queue method');
//             return Inertia::render('consultations/queue', [
//                 'queue' => [],
//                 'error' => 'User not authenticated'
//             ]);
//         }

//      $queue = PatientVisit::join('patients', 'patients.id', '=', 'patient_visits.patient_id')
//     ->where('to_queue', $userId)
//     ->orderBy('patient_visits.created_at', 'asc')
//     ->get();

//     Log::info('Queue results:', [
//         'count' => $queue->count(),
//         'user_id' => $userId
//     ]);

// return Inertia::render('consultations/queue', [
//     'queue' => $queue,
//     'user_id' => $userId
// ]);
//     }



    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
