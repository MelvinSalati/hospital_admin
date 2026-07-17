<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Patients\Consultation;
use App\Helpers\ConsultationHelper;
use Inertia\Inertia;

class InteractionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(int $patientId)
    {

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
        return Inertia::render(
            'patients/consultation',
            ['recentInteractions' => $consultations]
        );
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
        $validateInputs  = Validator::make($request->all(),[
            'patient_id' => 'required|exists:patients,id',
            'chiefComplaints' => 'required|array',
            'presciption'   => 'required|array'
        ]);


        if($validateInputs->fails()){
            return $validateInputs->errors();
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
