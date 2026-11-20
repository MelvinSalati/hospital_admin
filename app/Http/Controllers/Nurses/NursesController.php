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
use App\Models\BulkStores\DepartmentRequisition;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;



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

    public function bulkstore(int $departmentId)
    {
        /* ---------- 1. Product requests (orderedItems) ---------- */
        $orderedItems = DepartmentRequisition::with([
            'department:id,name',
            'requestedBy:id,name',
            'items.product:id,product_name,product_code',
        ])
            ->where('department_id', $departmentId)
            ->latest('requested_at')
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

                    // line items for the details drawer
                    'items' => $req->items->map(function ($item) {
                        return [
                            'id'                   => $item->id,
                            'product_id'           => $item->product_id,
                            'product_name'         => $item->product?->product_name ?? 'Unknown',
                            'product_code'         => $item->product?->product_code,
                            'quantity_requested'   => $item->quantity_requested,
                            'quantity_approved'    => $item->quantity_approved,
                            'quantity_fulfilled'   => $item->quantity_fulfilled,
                            'unit'                 => $item->unit,
                            'estimated_unit_price' => (float) ($item->estimated_unit_price ?? 0),
                            'estimated_total'      => (float) ($item->estimated_total ?? 0),
                            'batch_number'         => $item->batch_number,
                            'expiry_date'          => $item->expiry_date
                                ? Carbon::parse($item->expiry_date)->format('Y-m-d')
                                : null,
                            'status'               => $item->status,
                            'notes'                => $item->notes,
                        ];
                    })->values()->all(),
                ];
            })
            ->values()
            ->all();

        /* ---------- 2. Batches for products this department holds ----------
         * One row per stock batch (no join against ledger rows, so batches are
         * never duplicated), with explicit columns so `id` is the batch id.
         */
        $today = Carbon::today();

        $batchRows = DB::table('stock_batches as sb')
            ->join('products as p', 'p.id', '=', 'sb.product_id')
            ->leftJoin('suppliers as s', 's.id', '=', 'sb.supplier_id')
            ->whereIn('sb.product_id', function ($q) use ($departmentId) {
                $q->select('drug_id')
                    ->from('department_stock_ledger_items')
                    ->where('department_id', $departmentId);
            })
            ->select([
                'sb.id',
                'sb.batch_number',
                'sb.expiry_date',
                'sb.received_quantity',
                'sb.remaining_quantity',
                'sb.created_at',
                'p.product_name',
                'p.product_code',
                's.supplier_name',
            ])
            ->orderBy('sb.expiry_date', 'asc')
            ->get()
            ->map(function ($b) use ($today) {
                $expiry = $b->expiry_date ? Carbon::parse($b->expiry_date)->startOfDay() : null;

                return [
                    'id'                 => $b->id,
                    'product_name'       => $b->product_name,
                    'product_code'       => $b->product_code,
                    'batch_number'       => $b->batch_number,
                    'supplier'           => $b->supplier_name,
                    'quantity_received'  => (int) $b->received_quantity,
                    'quantity_remaining' => (int) $b->remaining_quantity,
                    'unit'               => null,
                    'received_at'        => $b->created_at
                        ? Carbon::parse($b->created_at)->format('d F Y')
                        : null,
                    'expiry_date'        => $expiry?->format('d F Y'),
                    // negative = already expired
                    'days_to_expiry'     => $expiry ? (int) $today->diffInDays($expiry, false) : null,
                ];
            });

        // ExpiringProduct[]: every batch that still has stock and an expiry date,
        // soonest expiry first (already-expired batches come first, as negative days)
        $expiringProducts = $batchRows
            ->filter(fn($b) => $b['quantity_remaining'] > 0
                && $b['days_to_expiry'] !== null)
            ->sortBy('days_to_expiry')
            ->map(fn($b) => [
                'id'             => $b['id'],
                'product_name'   => $b['product_name'],
                'product_code'   => $b['product_code'],
                'batch_number'   => $b['batch_number'],
                'quantity'       => $b['quantity_remaining'],
                'unit'           => $b['unit'],
                'expiry_date'    => $b['expiry_date'],
                'days_to_expiry' => $b['days_to_expiry'],
            ])
            ->values()
            ->all();

        // ProductBatch[]: every batch, without the helper field the page does not use
        $productBatches = $batchRows
            ->map(fn($b) => collect($b)->except('days_to_expiry')->all())
            ->values()
            ->all();

        return Inertia::render('pharmacies/bulkstore', [
            'services'         => \App\Models\Services\Service::all(),
            'orderedItems'     => $orderedItems,
            'expiringProducts' => $expiringProducts,
            'productBatches'   => $productBatches,
        ]);
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

    public function visit(int $departmentId)
    {
        $visits = PatientVisit::with([
            'patient',
            'assignedStaff',
            'assignedDepartment',
            'visitToken',
        ])
            ->where('department_id', $departmentId)
            ->where(function ($q) {
                // In progress: always show
                $q->where('status', 1)
                    // Completed (out of the queue): keep the Completed tab to recent history
                    ->orWhere(function ($q) {
                        $q->where('status', 0)
                            ->where('updated_at', '>=', now()->subDays(7));
                    });
            })
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($visit) {
                return [
                    'id' => $visit->id,
                    'token' => $visit->visitToken?->token
                        ?? 'T-' . str_pad($visit->id, 4, '0', STR_PAD_LEFT),
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
                    'status' => (int) $visit->status, // 1 = in progress, 0 = completed
                    'registered_at' => $visit->started_at
                        ? $visit->started_at->format('Y-m-d H:i:s')
                        : $visit->created_at->format('Y-m-d H:i:s'),
                    'assigned_department' => $visit->assignedDepartment?->department_name ?? 'Not assigned',
                    'assigned_staff' => $visit->assignedStaff?->name ?? 'Not assigned',
                    'visit_status' => $this->mapVisitStatus($visit->status),
                    'priority' => $visit->priority ?? 'routine',
                    'department_id' => $visit->department_id,
                ];
            });

        return Inertia::render('nurses/visits', [
            'queue' => $visits,
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
