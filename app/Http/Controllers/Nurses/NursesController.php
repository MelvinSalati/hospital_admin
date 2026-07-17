<?php

namespace App\Http\Controllers\Nurses;

use App\Http\Controllers\Controller;
use App\Models\Patients\VisitToken;
use App\Models\PatientVisit;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class NursesController extends Controller
{
    public function dashboard(){
        return Inertia::render('nurses/dashboard');
    }
    /**
     * Display the nurses dashboard with queue
     */
    public function index()
    {
        // Get all active visit tokens with patient and visit information
        $queuedPatients = PatientVisit::with(['patient', 'assignedDepartment', 'assignedStaff', 'visitToken'])
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
        $stats = [
            'total_in_queue' => VisitToken::where('status', 'active')->count(),
            'pending_assignment' => VisitToken::where('status', 'active')
                ->whereNull('assigned_department_id')
                ->count(),
            'assigned_today' => VisitToken::whereDate('created_at', today())
                ->where('status', 'active')
                ->count(),
        ];

        return Inertia::render('nurses/nurses', [
            'queue' => $queuedPatients,
            'stats' => $stats,
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

    private function routeComponent(){
        return 'nurses/dashboard';
    }
}
