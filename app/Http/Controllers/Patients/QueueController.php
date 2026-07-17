<?php

namespace App\Http\Controllers\Patients;

use App\Helpers\VisitTokenHelper;
use App\Http\Controllers\Controller;
use App\Models\Patients\Interaction;
use App\Models\Patients\Patient;
use App\Repositories\Departments\DepartmentRepository;
use App\Services\PatientService;
use App\Services\QueueService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class QueueController extends Controller
{
    protected  QueueService $queueService;
    protected  DepartmentRepository $departmentRepository;
    protected  PatientService $patientService;
    public function __construct(QueueService $queueService, DepartmentRepository $departmentRepository, PatientService $patientService  )
    {
        $this->queueService     = $queueService;
        $this->departmentRepository = $departmentRepository;
        $this->patientService =  $patientService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }
public function token($patientId){
    $patient  = new VisitTokenHelper();
    return  $patient->getActiveToken($patientId);
}
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {

        $getPatientId = $this->patientService->getPatientIdByPatientNumber($request->patient_number);

        try {
            if ($this->queueService->createVisit($request->all())) {

                $interaction = Interaction::create([
                    'patient_id' => $getPatientId->id,
                    'provider_id' => $request->created_by,
                    'type' => 'visit',
                    'description' => "Patient Queued to " . $this->departmentRepository->getDepartmentName($request->department_id) . " " ,
                    'status' => 'completed',
                    'visit_token' => $request->visit_token
                ]);



                return response()->json([
                    'message' => "Patient Queued to" . $this->departmentRepository->getDepartmentName($request->department_id),
                    'interaction_id' => $interaction->id,
                    'interaction_uuid' => $interaction->interaction_uuid
                ], 200);
            } else {
                return response()->json([
                    'message' => 'Patient is queued already in the queue!',
                    'status' => 301
                ]);
            }
        } catch (\Exception $e) {
            // Log the error with details
            Log::error('Failed to create interaction', [
                'error' => $e->getMessage(),
                'patient_id' => $getPatientId->id ?? null,
                'provider_id' => auth()->id(),
                'patient_number' => $request->patient_number
            ]);

            return response()->json([
                'message' => $e->getMessage()
            ], 500);
        }
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
