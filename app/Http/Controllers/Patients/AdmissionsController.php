<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Models\Patients\Consultation;
use App\Models\Patients\Interaction;
use App\Models\Services\Service;
use App\Models\UserProfile;
use App\Models\Patients\Admission;
use Illuminate\Support\Facades\Validator;
use App\Helpers\ConsultationHelper;
use App\Helpers\VisitTokenHelper;
use App\Models\Patients\Prescription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Payments\PaymentMethod;
use Inertia\Inertia; 

class AdmissionsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index($patientId)
    {
        $icd10Diagnosis = DB::table('icd10_diseases')
            ->select('id', 'code', 'category', 'description')
            ->orderBy('code')
            ->get();

        $consultations = Consultation::where('patient_id', $patientId)
            ->with('diagnoses')
            ->latest()
            ->get()
            ->map(function ($consultation) {
                $helper = new ConsultationHelper($consultation);

                return [
                    'id' => $consultation->id,
                    'consultation_uuid' => $consultation->consultation_uuid,
                    'chief_complaints' => $helper->getChiefComplaints(),
                    'chief_complaints_summary' => $helper->getChiefComplaintsSummary(),
                    'drug_history' => $helper->getDrugHistory(),
                    'drug_history_summary' => $helper->getDrugHistorySummary(),
                    'medical_conditions' => $helper->getMedicalConditions(),
                    'medical_conditions_summary' => $helper->getMedicalConditionsSummary(),
                    'physical_exam' => $helper->getPhysicalExam(),
                    'has_chief_complaints' => $helper->hasChiefComplaints(),
                    'status' => $consultation->status,
                    'submitted_at' => $consultation->submitted_at,
                    'diagnoses' => $consultation->diagnoses->map(function ($diagnosis) {
                        return [
                            'id' => $diagnosis->id,
                            'diagnosis_uuid' => $diagnosis->diagnosis_uuid,
                            'diagnosis' => $diagnosis->diagnosis,
                            'icd10_code' => $diagnosis->icd10_code,
                            'diagnosed_date' => $diagnosis->diagnosed_date,
                            'notes' => $diagnosis->notes,
                            'status' => $diagnosis->status,
                            'created_at' => $diagnosis->created_at,
                    ];
                    }),
                ];
            })->values();

        $nursingDiagnosis = DB::table('nursing_diagnoses')
            ->where('patient_id', $patientId)
            ->orderBy('created_at', 'desc')
            ->get();

        // Get default payment method (if needed for display)
        $defaultPaymentMethod = PaymentMethod::where('patient_id', $patientId)
            ->where('is_default', 1)
            ->where('type', 'mobile_money')
            ->first();

        // Get drugs and add ONLY cash price
        $drugs = Service::where('service_category', 'drugs')->get();
        $drugs->transform(function ($drug) use ($defaultPaymentMethod) {
            $drug->display_price = $drug->cash_price; // Only show cash price
            // Optional: Add payment method info if needed
            if ($defaultPaymentMethod) {
                $drug->payment_method = $defaultPaymentMethod->provider;
            }
            return $drug;
        });

        // Get procedures and add ONLY cash price
        $procedures = Service::where('service_category', 'procedure')->get();
        $procedures->transform(function ($procedure) use ($defaultPaymentMethod) {
            $procedure->display_price = $procedure->cash_price; // Only show cash price
            // Optional: Add payment method info if needed
            if ($defaultPaymentMethod) {
                $procedure->payment_method = $defaultPaymentMethod->provider;
            }
            return $procedure;
        });

        $laboratoryTest  = Service::where('service_category','Laboratory')->get();
        $imaging  = Service::where('service_category', 'imaging')->get();

        $prescriptions  = Prescription::where('patient_id', $patientId)->where('is_admitted', true)
        ->whereNotNUll('admission_number')->get();

        return Inertia::render("patients/admission", [
            'drugs'             => $drugs,
            'procedures'        => $procedures,
            'admissions'        => Admission::where('patient_id', $patientId)->get(),
            'doctors'           => UserProfile::whereJsonContains('roles', 'doctor')->get(),
            'interactions'      => $consultations,
            'icd10_diagnosis'   => $icd10Diagnosis,
            'nursing_diagnosis' => $nursingDiagnosis,
            'defaultPaymentMethod' => $defaultPaymentMethod,
            'admission_number'  => Admission::where('patient_id', $patientId)->where('status','active')->value('admission_number'),
            'prescriptions'     => $prescriptions,
            'laboratoryTests'   => $laboratoryTest,
            'imagingOrders'     => $imaging
        ]);
    }

    public function discharge($admissionId)
    {
        $admission = Admission::find($admissionId);

        if (!$admission) {
            return response()->json(['message' => 'Admission not found'], 404);
        }

        if ($admission->status === 'discharged') {
            return response()->json(['message' => 'Patient is already discharged'], 400);
        }

        // Direct assignment
        $admission->status = 'discharged';
        $admission->save();

        return response()->json([
            'message' => 'Patient discharged successfully',
            'status' => $admission->status
        ], 200);
        // Get consultation data if needed
        // $consultationData = $admission->consultations()->latest()->first(); // Or whatever relation you have

        // Send email notification (uncomment and configure as needed)
        // Mail::to($admission->patient->email)->send(new PatientDischarged($admission));


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

        // add to array 

        $data         = array_merge($request->all(),[
            'visit_token' => $visitToken->token
        ]);
        
        $validateInput = Validator::make($data,[
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:users,id',
            'admitted_by' => 'required|exists:users,id',
            'diagnosis_on_admission' => 'nullable|string',
        ]);

        if($validateInput->fails()){
            return response()->json([
                'status' => false,
                'message' => 'Validation errors',
                'errors' => $validateInput->errors()
            ], 422);
        }

        $createAdmission = \App\Models\Patients\Admission::create($request->all()); 

        if($createAdmission){
            Interaction::created([
                'description' => 'Patient admitted to '.$request->to,
                'provider_id' => Auth()->id(),
                'patient_id'  => $request->patient_id,
                'status'      => 'completed',
                'type'        => 'admission'
            ]);
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
