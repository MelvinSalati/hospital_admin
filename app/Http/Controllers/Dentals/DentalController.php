<?php

namespace App\Http\Controllers\Dentals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\PatientVisit; 

class DentalController extends Controller
{
    public function index(){
     $queuedPatients = PatientVisit::with(['patient', 'assignedDepartment', 'assignedStaff', 'visitToken'])
            ->where('department_id', 8)
            ->where('status', 1) // 1 = queued/active
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($visit) {
                return [
                    'id' => $visit->id,
                    'token' => $visit->visitToken?->token ?? $visit->visit_token, // Get token from visitToken relationship
                    'visit_token_id' => $visit->visitToken?->id,
                    'patient_id' => $visit->patient_id,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'contact' => $visit->patient?->phone ?? 'N/A',
                    'gender' => $visit->patient?->gender ?? 'N/A',
                    'payment_method' => $visit->payment_method,
                    'original_payment_method' => $visit->visitToken?->original_payment_method ?? $visit->original_payment_method, // Get original_payment from visitToken
                    'status' => $visit->status,
                    'registered_at' => $visit->started_at ? $visit->started_at->format('Y-m-d H:i:s') : $visit->created_at->format('Y-m-d H:i:s'),
                    'assigned_department' => $visit->assignedDepartment?->department_name ?? 'Not assigned',
                    'assigned_staff' => $visit->assignedStaff?->name ?? 'Not assigned',
                    'visit_status' => $this->mapVisitStatus($visit->status),
                    'priority' => $visit->priority ?? 'routine',
                    'department_id' => $visit->department_id,
                ];
            }); // Get statistics for department 8
        $stats = [
            'total_in_queue' => PatientVisit::where('department_id', 8)
                ->where('status', 1)
                ->count(),
            'pending_assignment' => PatientVisit::where('department_id', 8)
                ->where('status', 1)
                ->whereNull('to_queue')
                ->count(),
            'assigned_today' => PatientVisit::where('department_id', 8)
                ->whereDate('created_at', today())
                ->where('status', 1)
                ->count(),
        ];
        return Inertia::render('dentals/index',[
            'queue' => $queuedPatients,
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
