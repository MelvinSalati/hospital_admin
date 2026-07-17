<?php

namespace App\Http\Controllers\Patients;

use App\Helpers\MedicalDiagnosisHelper;
use App\Http\Controllers\Controller;
use App\Models\Patients\Admission;
use App\Models\Patients\Consultation;
use App\Jobs\InteractionJob;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use App\Models\ICD10Dx\Diagnosis;
use App\Helpers\VisitTokenHelper;
use Illuminate\Support\Facades\Log;

class ConsultationController extends Controller
{
    protected $medicalDiagnosis;
    /**
     * Display a listing of the resource.
     */
    public function index(int $patientId)
    {
        $interactions  = Consultation::where('patient_id',$patientId)->get();
        return Inertia::render('patients/consultation',
         ['recentInteractions' => $interactions]);
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
        $visitToken   = VisitTokenHelper::getActiveToken($request->patient_id);

      if(!$visitToken){
        return response()->json([
            'message' => 'Please start visit to save consultation!'
        ],404);
      }
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctors_id' => 'nullable|exists:users,id',
            'chiefComplaints' => 'nullable|array',
            'clinicalAnalysis' => 'nullable|array',
            'drugHistory' => 'nullable|array',
            'healthEducation' => 'nullable|array',
            'imagingOrders' => 'nullable|array',
            'labOrders' => 'nullable|array',
            'medicalConditions' => 'nullable|array',
            'physicalExam' => 'nullable|array',
            'prescription' => 'nullable|array',
            'status' => 'nullable|string|in:pending,completed,cancelled',
            'submitted_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        // Prepare data for insertion
        $consultationData = [
            'consultation_uuid' => (string) Str::uuid(),
            'patient_id' => $validated['patient_id'],
            'doctors_id' => $validated['doctors_id'] ?? null,
            'chief_complaints' => json_encode($validated['chiefComplaints'] ?? []),
            'clinical_analysis' => json_encode($validated['clinicalAnalysis'] ?? []),
            'drug_history' => json_encode($validated['drugHistory'] ?? []),
            'health_education' => json_encode($validated['healthEducation'] ?? []),
            'imaging_orders' => json_encode($validated['imagingOrders'] ?? []),
            'lab_orders' => json_encode($validated['labOrders'] ?? []),
            'medical_conditions' => json_encode($validated['medicalConditions'] ?? []),
            'physical_exam' => json_encode($validated['physicalExam'] ?? []),
            'prescription' => json_encode($validated['prescription'] ?? []),
            'status' => $validated['status'] ?? 'completed',
            'submitted_at' => $validated['submitted_at'] ?? now(),
            'notes' => $validated['notes'] ?? null,
        ];

        /**
         * Check if admitted
         */
        $isAdmitted = Admission::where('patient_id', $request->patient_id)
            ->where('status', 'active')
            ->pluck('admission_number')
            ->first();

        if ($isAdmitted) {
            $data   = array_merge($consultationData, [
                'admission_number' => $isAdmitted ?? null
            ]);
        }
        $data         = array_merge($consultationData, [
            'visit_token' => $visitToken->token
        ]);

        $consultation = Consultation::create($data);



        if ($consultation) {
            InteractionJob::dispatch([
                'description' => 'New consultation created',
                'provider_id' => $request->doctor_id,
                'patient_id'  => $request->patient_id,
                'status'      => 'completed',
                'type'        => 'consultation'
            ]);
            return response()->json([
                'status' => true,
                'message' => 'Consultation created successfully',
                'data' => $consultation
            ], 201);
        } else {
            return response()->json([
                'status' => false,
                'message' => 'Failed to create consultation'
            ], 500);
        }
    }

    public function addDiagnosis(Request $request, MedicalDiagnosisHelper $medicalDiagnosis)
{

    /**
     * param $diagnosis
     */

    $diagnosis      =     $request->input('diagnosis');
    $identifiedDx   =     $medicalDiagnosis->getDiagnosis($diagnosis);

    /**
     * add dianosis to array
     */


    $validated = $request->validate([
        'patient_id' => 'required|exists:patients,id',
        'consultation_uuid' => 'required|exists:consultations,consultation_uuid',
        'icd10_code' => 'nullable|string|max:20',
        'diagnosed_date' => 'required|date',
        'status' => 'required|in:active,resolved,chronic,inactive',
        'notes' => 'nullable|string',
    ]);


    $patientDiagnosis = [
            'diagnosis_uuid' => Str::uuid(),
            'patient_id' => $validated['patient_id'],
            'consultation_uuid' => $validated['consultation_uuid'],
            'icd10_code' => $validated['icd10_code'],
            'diagnosed_date' => $validated['diagnosed_date'],
            'status' => $validated['status'],
            'notes' => $validated['notes'],
    ];

    Log::info('diagnosis', [$identifiedDx]);

    $diagnosisDetails =  array_merge($patientDiagnosis,[
        'diagnosis'   => $identifiedDx
    ]);

    /**
     * Param array $diagnosisDetails
     * update patient diagnosis
     */

    $diagnosis = Diagnosis::create($diagnosisDetails);

    return response()->json([
        'status' => true,
        'message' => 'Diagnosis added successfully',
        'data' => $diagnosis
    ], 201);
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
