<?php

namespace App\Http\Controllers\Dentals;

use App\Http\Controllers\Controller;
use App\Repositories\Appointments\AppointmentRepository;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\PatientVisit;

class DentalController extends Controller
{
    public function dashboard()
    {
        return Inertia::render('dentals/dashboard');
    }
    /**
     * Display Theatre department billables.
     */
    public function index(Request $request, int $departmentId)
    {
        return Inertia::render('dentals/dashboard', [
            'departmentId' => $departmentId,
        ]);
    }

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
