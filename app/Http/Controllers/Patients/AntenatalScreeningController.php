<?php

namespace App\Http\Controllers\Patients;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use App\Http\Controllers\Controller;

class AntenatalScreeningController extends Controller
{
    /**
     * Store a new antenatal screening record
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            // Validate the request data
            $validator = Validator::make($request->all(), [
                'patient_id' => 'required|exists:patients,id',
                'lmp' => 'nullable|date',
                'edd' => 'nullable|date',
                'gestational_age_weeks' => 'nullable|integer|min:1|max:42',
                'gestational_age_days' => 'nullable|integer|min:0|max:6',
                'gravidity' => 'nullable|integer|min:0',
                'parity' => 'nullable|integer|min:0',
                'planned_pregnancy' => 'nullable|boolean',

                // Obstetric History
                'previous_cs' => 'nullable|boolean',
                'previous_stillbirth' => 'nullable|boolean',
                'previous_miscarriage' => 'nullable|boolean',
                'previous_preterm' => 'nullable|boolean',
                'previous_pph' => 'nullable|boolean',
                'multiple_gestation_history' => 'nullable|boolean',

                // Medical History
                'hypertension' => 'nullable|boolean',
                'diabetes' => 'nullable|boolean',
                'hiv' => 'nullable|boolean',
                'tuberculosis' => 'nullable|boolean',
                'epilepsy' => 'nullable|boolean',
                'asthma' => 'nullable|boolean',
                'cardiac_disease' => 'nullable|boolean',
                'sickle_cell' => 'nullable|boolean',

                // Family History
                'fh_hypertension' => 'nullable|boolean',
                'fh_diabetes' => 'nullable|boolean',
                'fh_multiple_pregnancies' => 'nullable|boolean',
                'fh_genetic_disorders' => 'nullable|boolean',

                // Physical Examination
                'weight' => 'nullable|numeric|min:0|max:300',
                'height' => 'nullable|numeric|min:0|max:300',
                'bp_systolic' => 'nullable|integer|min:0|max:300',
                'bp_diastolic' => 'nullable|integer|min:0|max:200',
                'temperature' => 'nullable|numeric|min:30|max:45',
                'pulse_rate' => 'nullable|integer|min:0|max:250',
                'respiratory_rate' => 'nullable|integer|min:0|max:100',
                'edema' => 'nullable|boolean',

                // Fetal Assessment
                'fundal_height' => 'nullable|numeric|min:0|max:60',
                'fetal_heart_rate' => 'nullable|integer|min:60|max:200',
                'fetal_presentation' => 'nullable|in:cephalic,breech,transverse,oblique',
                'fetal_movement' => 'nullable|boolean',

                // Danger Signs
                'vaginal_bleeding' => 'nullable|boolean',
                'severe_headache' => 'nullable|boolean',
                'blurred_vision' => 'nullable|boolean',
                'convulsions' => 'nullable|boolean',
                'reduced_fetal_movement' => 'nullable|boolean',
                'severe_abdominal_pain' => 'nullable|boolean',
                'fever' => 'nullable|boolean',
                'leakage_of_liquor' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Begin database transaction
            DB::beginTransaction();

            // Calculate BMI if weight and height are provided
            $bmi = null;
            if ($request->weight && $request->height) {
                $heightInMeters = $request->height / 100;
                $bmi = round($request->weight / ($heightInMeters * $heightInMeters), 1);
            }

            // Calculate EDD from LMP if not provided but LMP is provided
            $edd = $request->edd;
            if (!$edd && $request->lmp) {
                $lmpDate = Carbon::parse($request->lmp);
                $edd = $lmpDate->addDays(280)->format('Y-m-d');
            }

            // 1. Insert into main antenatal_screenings table
            $antenatalId = DB::table('antenatal_screenings')->insertGetId([
                'patient_id' => $request->patient_id,
                'screening_date' => Carbon::now()->format('Y-m-d'),
                'visit_number' => $this->getNextVisitNumber($request->patient_id),
                'lmp' => $request->lmp,
                'edd' => $edd,
                'gestational_age_weeks' => $request->gestational_age_weeks,
                'gestational_age_days' => $request->gestational_age_days ?? 0,
                'gravidity' => $request->gravidity,
                'parity' => $request->parity,
                'planned_pregnancy' => $request->planned_pregnancy,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 2. Insert into obstetric history
            if ($this->hasObstetricHistoryData($request)) {
                DB::table('antenatal_obstetric_history')->insert([
                    'antenatal_id' => $antenatalId,
                    'previous_cs' => $request->previous_cs,
                    'previous_stillbirth' => $request->previous_stillbirth,
                    'previous_miscarriage' => $request->previous_miscarriage,
                    'previous_preterm' => $request->previous_preterm,
                    'previous_pph' => $request->previous_pph,
                    'multiple_gestation_history' => $request->multiple_gestation_history,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 3. Insert into medical history
            if ($this->hasMedicalHistoryData($request)) {
                DB::table('antenatal_medical_history')->insert([
                    'antenatal_id' => $antenatalId,
                    'hypertension' => $request->hypertension,
                    'diabetes' => $request->diabetes,
                    'hiv' => $request->hiv,
                    'tuberculosis' => $request->tuberculosis,
                    'epilepsy' => $request->epilepsy,
                    'asthma' => $request->asthma,
                    'cardiac_disease' => $request->cardiac_disease,
                    'sickle_cell' => $request->sickle_cell,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 4. Insert into family history
            if ($this->hasFamilyHistoryData($request)) {
                DB::table('antenatal_family_history')->insert([
                    'antenatal_id' => $antenatalId,
                    'hypertension' => $request->fh_hypertension,
                    'diabetes' => $request->fh_diabetes,
                    'multiple_pregnancies' => $request->fh_multiple_pregnancies,
                    'genetic_disorders' => $request->fh_genetic_disorders,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 5. Insert into physical examination
            if ($this->hasPhysicalExamData($request)) {
                DB::table('antenatal_physical_examination')->insert([
                    'antenatal_id' => $antenatalId,
                    'weight' => $request->weight,
                    'height' => $request->height,
                    'bmi' => $bmi,
                    'bp_systolic' => $request->bp_systolic,
                    'bp_diastolic' => $request->bp_diastolic,
                    'temperature' => $request->temperature,
                    'pulse_rate' => $request->pulse_rate,
                    'respiratory_rate' => $request->respiratory_rate,
                    'edema' => $request->edema,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 6. Insert into fetal assessment
            if ($this->hasFetalAssessmentData($request)) {
                DB::table('antenatal_fetal_assessment')->insert([
                    'antenatal_id' => $antenatalId,
                    'fundal_height' => $request->fundal_height,
                    'fetal_heart_rate' => $request->fetal_heart_rate,
                    'fetal_presentation' => $request->fetal_presentation,
                    'fetal_movement' => $request->fetal_movement,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 7. Insert into danger signs
            if ($this->hasDangerSignsData($request)) {
                DB::table('antenatal_danger_signs')->insert([
                    'antenatal_id' => $antenatalId,
                    'vaginal_bleeding' => $request->vaginal_bleeding,
                    'severe_headache' => $request->severe_headache,
                    'blurred_vision' => $request->blurred_vision,
                    'convulsions' => $request->convulsions,
                    'reduced_fetal_movement' => $request->reduced_fetal_movement,
                    'severe_abdominal_pain' => $request->severe_abdominal_pain,
                    'fever' => $request->fever,
                    'leakage_of_liquor' => $request->leakage_of_liquor,
                    'requires_referral' => $this->checkIfRequiresReferral($request),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 8. Insert into follow-up
            DB::table('antenatal_follow_up')->insert([
                'antenatal_id' => $antenatalId,
                'risk_level' => $this->calculateRiskLevel($request),
                'next_visit_date' => Carbon::now()->addWeeks(4)->format('Y-m-d'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Commit transaction
            DB::commit();

            // Return success response
            return response()->json([
                'success' => true,
                'message' => 'Antenatal screening created successfully',
                'data' => [
                    'id' => $antenatalId,
                    'patient_id' => $request->patient_id,
                    'screening_date' => Carbon::now()->format('Y-m-d'),
                    'visit_number' => $this->getNextVisitNumber($request->patient_id),
                    'edd' => $edd,
                    'bmi' => $bmi,
                    'risk_level' => $this->calculateRiskLevel($request)
                ]
            ], 200);
        } catch (\Exception $e) {
            // Rollback transaction on error
            DB::rollBack();

            // Log error for debugging
            \Log::error('Antenatal screening save error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            // Return error response
            return response()->json([
                'success' => false,
                'message' => 'Failed to save antenatal screening',
                'error' => $e->getMessage(),
                'details' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Get next visit number for a patient
     *
     * @param int $patientId
     * @return int
     */
    private function getNextVisitNumber($patientId)
    {
        $lastVisit = DB::table('antenatal_screenings')
            ->where('patient_id', $patientId)
            ->max('visit_number');

        return $lastVisit ? $lastVisit + 1 : 1;
    }

    /**
     * Check if obstetric history data exists
     *
     * @param Request $request
     * @return bool
     */
    private function hasObstetricHistoryData($request)
    {
        return $request->hasAny([
            'previous_cs',
            'previous_stillbirth',
            'previous_miscarriage',
            'previous_preterm',
            'previous_pph',
            'multiple_gestation_history'
        ]);
    }

    /**
     * Check if medical history data exists
     *
     * @param Request $request
     * @return bool
     */
    private function hasMedicalHistoryData($request)
    {
        return $request->hasAny([
            'hypertension',
            'diabetes',
            'hiv',
            'tuberculosis',
            'epilepsy',
            'asthma',
            'cardiac_disease',
            'sickle_cell'
        ]);
    }

    /**
     * Check if family history data exists
     *
     * @param Request $request
     * @return bool
     */
    private function hasFamilyHistoryData($request)
    {
        return $request->hasAny([
            'fh_hypertension',
            'fh_diabetes',
            'fh_multiple_pregnancies',
            'fh_genetic_disorders'
        ]);
    }

    /**
     * Check if physical examination data exists
     *
     * @param Request $request
     * @return bool
     */
    private function hasPhysicalExamData($request)
    {
        return $request->hasAny([
            'weight',
            'height',
            'bp_systolic',
            'bp_diastolic',
            'temperature',
            'pulse_rate',
            'respiratory_rate',
            'edema'
        ]);
    }

    /**
     * Check if fetal assessment data exists
     *
     * @param Request $request
     * @return bool
     */
    private function hasFetalAssessmentData($request)
    {
        return $request->hasAny([
            'fundal_height',
            'fetal_heart_rate',
            'fetal_presentation',
            'fetal_movement'
        ]);
    }

    /**
     * Check if danger signs data exists
     *
     * @param Request $request
     * @return bool
     */
    private function hasDangerSignsData($request)
    {
        return $request->hasAny([
            'vaginal_bleeding',
            'severe_headache',
            'blurred_vision',
            'convulsions',
            'reduced_fetal_movement',
            'severe_abdominal_pain',
            'fever',
            'leakage_of_liquor'
        ]);
    }

    /**
     * Check if patient requires referral based on danger signs
     *
     * @param Request $request
     * @return bool
     */
    private function checkIfRequiresReferral($request)
    {
        $dangerSigns = [
            $request->vaginal_bleeding,
            $request->severe_headache,
            $request->blurred_vision,
            $request->convulsions,
            $request->reduced_fetal_movement,
            $request->severe_abdominal_pain,
            $request->fever,
            $request->leakage_of_liquor
        ];

        return in_array(true, $dangerSigns);
    }

    /**
     * Calculate risk level based on medical history and danger signs
     *
     * @param Request $request
     * @return string
     */
    private function calculateRiskLevel($request)
    {
        // Check for danger signs first (critical)
        if ($this->checkIfRequiresReferral($request)) {
            return 'critical';
        }

        // High risk factors
        $highRiskFactors = [
            $request->hypertension,
            $request->diabetes,
            $request->hiv,
            $request->cardiac_disease,
            $request->previous_cs,
            $request->multiple_gestation_history
        ];

        $highRiskCount = count(array_filter($highRiskFactors));

        if ($highRiskCount >= 2) {
            return 'high';
        }

        if ($highRiskCount === 1) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Get a specific antenatal screening record
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $screening = DB::table('antenatal_screenings')
                ->leftJoin('antenatal_obstetric_history', 'antenatal_screenings.id', '=', 'antenatal_obstetric_history.antenatal_id')
                ->leftJoin('antenatal_medical_history', 'antenatal_screenings.id', '=', 'antenatal_medical_history.antenatal_id')
                ->leftJoin('antenatal_physical_examination', 'antenatal_screenings.id', '=', 'antenatal_physical_examination.antenatal_id')
                ->leftJoin('antenatal_fetal_assessment', 'antenatal_screenings.id', '=', 'antenatal_fetal_assessment.antenatal_id')
                ->leftJoin('antenatal_danger_signs', 'antenatal_screenings.id', '=', 'antenatal_danger_signs.antenatal_id')
                ->leftJoin('antenatal_follow_up', 'antenatal_screenings.id', '=', 'antenatal_follow_up.antenatal_id')
                ->where('antenatal_screenings.id', $id)
                ->select('antenatal_screenings.*')
                ->first();

            if (!$screening) {
                return response()->json([
                    'success' => false,
                    'message' => 'Antenatal screening record not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Record retrieved successfully',
                'data' => $screening
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve record',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
