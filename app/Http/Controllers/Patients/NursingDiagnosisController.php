<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Models\Patients\NursingDiagnosis;
use App\Models\Patients\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class NursingDiagnosisController extends Controller
{
    /**
     * Display a listing of nursing diagnoses for a patient.
     */
    public function index($patientId)
    {
        try {
            $patient = Patient::findOrFail($patientId);

            $diagnoses = NursingDiagnosis::with(['creator', 'updater'])
                ->where('patient_id', $patientId)
                ->orderBy('date_identified', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'status' => true,
                'message' => 'Nursing diagnoses retrieved successfully',
                'data' => $diagnoses
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve nursing diagnoses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created nursing diagnosis.
     */
    public function store(Request $request, $patientId)
    {
        try {
            // Validate the request
            $validator = Validator::make($request->all(), [
                'problem' => 'required|string',
                'etiology' => 'required|string',
                'symptoms' => 'nullable|string',
                'intervention' => 'required|string',
                'evaluation' => 'nullable|string',
                'date_identified' => 'required|date',
                'status' => ['required', Rule::in(['active', 'in-progress', 'resolved', 'inactive', 'waiting...'])],
                'user_id' => 'nullable|integer',
                'is_smart' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $patient = Patient::findOrFail($patientId);

            $diagnosis = NursingDiagnosis::create([
                'nursing_diagnosis_uuid' => Str::uuid(),
                'patient_id' => $patientId,
                'admission_number' => $request->admission_number ?? $patient->admission_number,
                'problem' => $request->problem,
                'etiology' => $request->etiology,
                'symptoms' => $request->symptoms ?? 'none',
                'intervention' => $request->intervention,
                'evaluation' => $request->evaluation ?? 'waiting...',
                'date_identified' => $request->date_identified ?? Carbon::now(),
                'status' => $request->status ?? 'active',
                'is_smart' => $request->is_smart ?? false,
                'created_by' => $request->user_id ?? auth()->id(),
            ]);

            return response()->json([
                'status' => true,
                'message' => 'Nursing diagnosis created successfully',
                'data' => $diagnosis->load(['creator', 'updater'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to create nursing diagnosis',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified nursing diagnosis.
     */
    public function show($patientId, $id)
    {
        try {
            $diagnosis = NursingDiagnosis::with(['patient', 'creator', 'updater'])
                ->where('patient_id', $patientId)
                ->findOrFail($id);

            return response()->json([
                'status' => true,
                'message' => 'Nursing diagnosis retrieved successfully',
                'data' => $diagnosis
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Nursing diagnosis not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified nursing diagnosis.
     */
    public function update(Request $request, $patientId, $id)
    {
        try {
            // First find the diagnosis by ID only (ignore patient_id for the find)
            $diagnosis = NursingDiagnosis::findOrFail($id);
            // Optional: Verify it belongs to the patient
            if ($diagnosis->patient_id != $patientId) {
                return response()->json([
                    'status' => false,
                    'message' => 'Diagnosis does not belong to this patient'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'problem' => 'sometimes|required|string',
                'etiology' => 'sometimes|required|string',
                'symptoms' => 'nullable|string',
                'intervention' => 'sometimes|required|string',
                'evaluation' => 'nullable|string',
                'date_identified' => 'sometimes|required|date',
                'status' => ['sometimes', 'required', Rule::in(['active', 'in-progress', 'resolved', 'inactive', 'waiting...'])],
                'is_smart' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $updateData = $request->only([
                'problem',
                'etiology',
                'symptoms',
                'intervention',
                'evaluation',
                'date_identified',
                'status',
                'is_smart'
            ]);

            // Remove any null values that shouldn't be updated
            $updateData = array_filter($updateData, function ($value) {
                return $value !== null;
            });

            $updateData['updated_by'] = auth()->id();

            $diagnosis->update($updateData);

            return response()->json([
                'status' => true,
                'message' => 'Nursing diagnosis updated successfully',
                'data' => $diagnosis->load(['creator', 'updater'])
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to update nursing diagnosis',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update only the evaluation of a nursing diagnosis.
     */
    public function evaluate(Request $request, $patientId, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'evaluation' => 'required|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $diagnosis = NursingDiagnosis::findOrFail($id);

            if ($diagnosis->patient_id != $patientId) {
                return response()->json([
                    'status' => false,
                    'message' => 'Diagnosis does not belong to this patient'
                ], 403);
            }

            $diagnosis->update([
                'evaluation' => $request->evaluation,
                'status' => 'resolved',
                'updated_by' => auth()->id(),
            ]);

            return response()->json([
                'status' => true,
                'message' => 'Evaluation updated successfully',
                'data' => $diagnosis
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to update evaluation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified nursing diagnosis.
     */
    public function destroy($patientId, $id)
    {
        try {
            $diagnosis = NursingDiagnosis::findOrFail($id);

            if ($diagnosis->patient_id != $patientId) {
                return response()->json([
                    'status' => false,
                    'message' => 'Diagnosis does not belong to this patient'
                ], 403);
            }

            $diagnosis->delete();

            return response()->json([
                'status' => true,
                'message' => 'Nursing diagnosis deleted successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to delete nursing diagnosis',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get nursing diagnosis statistics for a patient.
     */
    public function statistics($patientId)
    {
        try {
            $patient = Patient::findOrFail($patientId);

            $stats = [
                'total' => NursingDiagnosis::where('patient_id', $patientId)->count(),
                'active' => NursingDiagnosis::where('patient_id', $patientId)->where('status', 'active')->count(),
                'in_progress' => NursingDiagnosis::where('patient_id', $patientId)->where('status', 'in-progress')->count(),
                'resolved' => NursingDiagnosis::where('patient_id', $patientId)->where('status', 'resolved')->count(),
                'smart_diagnoses' => NursingDiagnosis::where('patient_id', $patientId)->where('is_smart', true)->count(),
            ];

            return response()->json([
                'status' => true,
                'message' => 'Statistics retrieved successfully',
                'data' => $stats
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
