<?php
// app/Http/Controllers/Api/VitalSignsController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VitalSignsRecord;
use App\Models\Patients\Patient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Helpers\VisitTokenHelper;
use Carbon\Carbon;

class VitalSignsController extends Controller
{
    /**
     * Get all vital signs for a specific patient
     * This matches the GET request to /api/vital-signs/patient/{patientId}
     */
    public function getPatientVitalSigns(int $patientId): JsonResponse
    {
        try {
            $patient = Patient::findOrFail($patientId);

            $vitalSigns = VitalSignsRecord::with('recorder')
                ->where('patient_id', $patientId)
                ->orderBy('recorded_at', 'desc')
                ->get();

            return response()->json([
                'status' => true,
                'data' => $vitalSigns,
                'message' => 'Vital signs retrieved successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve vital signs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new vital signs record
     * This matches the POST request to /patients/vital-signs
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'consultation_uuid' => 'nullable|string',
            'temperature' => 'nullable|numeric|between:34,42',
            'pulse' => 'nullable|integer|between:30,200',
            'bp_systolic' => 'nullable|integer|between:50,250',
            'bp_diastolic' => 'nullable|integer|between:30,150',
            'oxygen_saturation' => 'nullable|integer|between:50,100',
            'weight' => 'nullable|numeric|between:1,300',
            'notes' => 'nullable|string|max:1000',
            'recorded_by' => 'required|exists:users,id',
            'recorded_at' => 'required|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $visitToken   = VisitTokenHelper::getActiveToken($request->patient_id);

        

        try { 
            DB::beginTransaction();

            $vitals       = [
                'vital_sign_uuid' => (string) \Illuminate\Support\Str::uuid(),
                'patient_id' => $request->patient_id,
                'consultation_uuid' => $request->consultation_uuid,
                'temperature' => $request->temperature,
                'pulse' => $request->pulse,
                'bp_systolic' => $request->bp_systolic,
                'bp_diastolic' => $request->bp_diastolic,
                'oxygen_saturation' => $request->oxygen_saturation,
                'admission_number' => $request->admission_number,
                'weight' => $request->weight,
                'notes' => $request->notes,
                'recorded_by' => $request->recorded_by,
                'recorded_at' => $request->recorded_at
            ];

            $data         = array_merge($vitals, [
                'visit_token' => $visitToken->token
            ]);

            $vitalSign = VitalSignsRecord::create($data);

            DB::commit();

            // Load the recorder relationship
            $vitalSign->load('recorder');

            return response()->json([
                'status' => true,
                'data' => $vitalSign,
                'message' => 'Vital signs recorded successfully'
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'status' => false,
                'message' => 'Failed to record vital signs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific vital signs record
     */
    public function getVitalSignRecord(int $id): JsonResponse
    {
        try {
            $vitalSign = VitalSignsRecord::with('recorder')->findOrFail($id);

            return response()->json([
                'status' => true,
                'data' => $vitalSign,
                'message' => 'Vital sign record retrieved successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Vital sign record not found'
            ], 404);
        }
    }

    /**
     * Update a vital signs record
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'temperature' => 'nullable|numeric|between:34,42',
            'pulse' => 'nullable|integer|between:30,200',
            'bp_systolic' => 'nullable|integer|between:50,250',
            'bp_diastolic' => 'nullable|integer|between:30,150',
            'oxygen_saturation' => 'nullable|integer|between:50,100',
            'weight' => 'nullable|numeric|between:1,300',
            'notes' => 'nullable|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $vitalSign = VitalSignsRecord::findOrFail($id);
            $vitalSign->update($request->only([
                'temperature',
                'pulse',
                'bp_systolic',
                'bp_diastolic',
                'oxygen_saturation',
                'weight',
                'notes'
            ]));

            DB::commit();

            return response()->json([
                'status' => true,
                'data' => $vitalSign->load('recorder'),
                'message' => 'Vital signs updated successfully'
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'status' => false,
                'message' => 'Failed to update vital signs'
            ], 500);
        }
    }

    /**
     * Delete a vital signs record
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $vitalSign = VitalSignsRecord::findOrFail($id);
            $vitalSign->delete();

            DB::commit();

            return response()->json([
                'status' => true,
                'message' => 'Vital signs record deleted successfully'
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'status' => false,
                'message' => 'Failed to delete vital signs record'
            ], 500);
        }
    }

    /**
     * Get latest vital signs for a patient
     */
    public function getLatestVitalSigns(int $patientId): JsonResponse
    {
        try {
            $vitalSign = VitalSignsRecord::with('recorder')
                ->where('patient_id', $patientId)
                ->latest('recorded_at')
                ->first();

            return response()->json([
                'status' => true,
                'data' => $vitalSign,
                'message' => 'Latest vital signs retrieved successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve latest vital signs'
            ], 500);
        }
    }

    /**
     * Get vital signs within a date range
     */
    public function getVitalSignsByDateRange(Request $request, int $patientId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $vitalSigns = VitalSignsRecord::with('recorder')
                ->where('patient_id', $patientId)
                ->whereBetween('recorded_at', [
                    Carbon::parse($request->start_date)->startOfDay(),
                    Carbon::parse($request->end_date)->endOfDay()
                ])
                ->orderBy('recorded_at', 'asc')
                ->get();

            return response()->json([
                'status' => true,
                'data' => $vitalSigns,
                'message' => 'Vital signs retrieved successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve vital signs'
            ], 500);
        }
    }

    /**
     * Get vital signs statistics for a patient
     */
    public function getStatistics(int $patientId): JsonResponse
    {
        try {
            $stats = VitalSignsRecord::where('patient_id', $patientId)
                ->select([
                    DB::raw('AVG(temperature) as avg_temperature'),
                    DB::raw('MIN(temperature) as min_temperature'),
                    DB::raw('MAX(temperature) as max_temperature'),
                    DB::raw('AVG(pulse) as avg_pulse'),
                    DB::raw('MIN(pulse) as min_pulse'),
                    DB::raw('MAX(pulse) as max_pulse'),
                    DB::raw('AVG(bp_systolic) as avg_bp_systolic'),
                    DB::raw('AVG(bp_diastolic) as avg_bp_diastolic'),
                    DB::raw('AVG(oxygen_saturation) as avg_oxygen_saturation'),
                    DB::raw('MIN(oxygen_saturation) as min_oxygen_saturation'),
                    DB::raw('MAX(oxygen_saturation) as max_oxygen_saturation'),
                    DB::raw('AVG(weight) as avg_weight'),
                    DB::raw('COUNT(*) as total_records')
                ])
                ->first();

            return response()->json([
                'status' => true,
                'data' => $stats,
                'message' => 'Statistics retrieved successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve statistics'
            ], 500);
        }
    }
}
