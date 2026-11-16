<?php

namespace App\Http\Controllers\Nurses;

use App\Http\Controllers\Controller;
use App\Models\Departments\Department;
use App\Models\Patients\VisitToken;
use App\Models\PatientVisit;
use Inertia\Inertia;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\Log;
use App\Models\Nurses\Admission;
use App\Services\Nurses\NursesDashboardService;



class NursesController extends Controller
{
    protected NursesDashboardService $service;

    public function __construct(NursesDashboardService $service)
    {
        $this->service  = $service;
    }

    public function dashboard(int $departmentId)
    {
        return Inertia::render('nurses/dashboard', $this->service->getDashboardData($departmentId));
    }
    /**
     * Display the nurses dashboard with queue
     */
    public function index()
    {
        // Get all active visit tokens with patient and visit information
        $queuedPatients = PatientVisit::with(['patient', 'assignedStaff', 'visitToken'])
            ->where('department_id', 6)
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

        // Get statistics

        Log::info('patient details ', [$queuedPatients]);

        return Inertia::render('nurses/nurses', [
            'queue' => $queuedPatients,
        ]);
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

    /**
     * Update patient status in queue
     */
    public function updateStatus(Request $request, $tokenId)
    {
        $request->validate([
            'status' => 'required|in:pending,in_progress,completed,cancelled',
        ]);

        try {
            $token = VisitToken::findOrFail($tokenId);

            if ($request->status === 'completed') {
                $token->complete();
            } elseif ($request->status === 'cancelled') {
                $token->cancel();
            } else {
                $token->update(['status' => $request->status]);
            }

            // Update the associated visit record
            $visit = PatientVisit::where('visit_token', $token->token)->first();
            if ($visit) {
                $visit->update(['status' => $request->status]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Status updated successfully',
                'data' => $token
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     *  view staff in the departments
     */

    public function viewStaff()
    {
        return Inertia::render(
            'nurses/nurse-department',
            ['viewStaffs' => User::all()]
        );
    }

    /**
     * Get patient details for view modal
     */
    public function getPatientDetails($tokenId)
    {
        try {
            $token = VisitToken::with(['patient', 'assignedDepartment', 'assignedStaff'])
                ->findOrFail($tokenId);

            $visit = PatientVisit::where('visit_token', $token->token)->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'token' => $token,
                    'patient' => $token->patient,
                    'visit' => $visit,
                    'department' => $token->assignedDepartment,
                    'staff' => $token->assignedStaff,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Patient not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    private function routeComponent()
    {
        return 'nurses/dashboard';
    }

    public function visit()
    {

        $visit  = PatientVisit::with(['patient', 'assignedStaff', 'visitToken'])
            ->where('department_id', 6)
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
        return  Inertia::render('nurses/visits', [
            'queues' => $visit
        ]);
    }

    public function inPatients()
    {
        return Inertia::render('nurses/in-patient', [
            'admitted' => [],
            'procedureItems' => [],
            'listOfAdmittedPatients' => Admission::with(['patient', 'admittedBy', 'dischargedBy'])
                ->where('status', 'active')
                ->get()
                ->map(fn($a) => [
                    'id'             => $a->patient_id,
                    'admission_number' => $a->admission_number,
                    'patient_name'   => trim(($a->patient->first_name ?? '') . ' ' . ($a->patient->last_name ?? '')),
                    'admission_date' => $a->date_of_admission,
                    'department'   => $a->admitted_to_ward ?? '—', // adjust if the column has a different name
                    'bed_number'     => $a->admitted_to_ward ?? '—',   // adjust if the column has a different name
                    'ward'           => $a->admitted_to_ward ?? '—',
                    'status'         => $a->status,
                    'priority'       => $a->priority,
                ]),
        ]);
    }
    /**
     *  get atients assigned to treatmebt room
     */
    public function  treatmentRoom()
    {

        $procedures          =   PatientVisit::with(['patient'])->where('department_id', 11)->where('status', 1)->get();
        $patientsInTreatment = $this->mapFields($procedures);

        return Inertia::render('nurses/treatment-room', [
            'procedures'  =>  $patientsInTreatment
        ]);
    }

    public function mapFields(object $patientsInTreatment)
    {
        return $patientsInTreatment->map(function ($items) {
            $patient = $items->patient;

            // Calculate age from date_of_birth
            $age = null;
            if (!empty($patient->date_of_birth)) {
                try {
                    $age = \Carbon\Carbon::parse($patient->date_of_birth)->age;
                } catch (\Exception $e) {
                    $age = null;
                }
            }

            // First letter of gender, uppercase
            $genderInitial = $patient->gender
                ? strtoupper(substr(trim($patient->gender), 0, 1))
                : '—';

            return [
                'id'         => $items->id,
                'patient_id' => $patient->id,
                'name'       => ucfirst($patient->first_name) . ' ' . ucfirst($patient->last_name),
                'age_sex'    => ($age !== null ? $age : '—') . ' / ' . $genderInitial,
                'token'     => $items->token,
                'created_at' => optional($items->created_at)->toDateTimeString(),
                'status'     => $this->mapVisitStatus($items->status),
            ];
        });
    }

    public function  userDepartment()
    {
        return Inertia::render('nurses/user-department', [
            'userDepartments'  => UserProfile::where('department_id', 6)->get()
        ]);
    }
}
