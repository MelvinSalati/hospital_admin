<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Models\Patients\DrugAdministration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
Use Illuminate\Support\Facades\Log;
class DrugAdministrationController extends Controller  // Changed class name
{
    /**
     * Get all drug administrations for a patient
     */
    public function index(Request $request, $patientId)
    {
        try {
            // Debug: Log the patient ID being searched
            Log::info('Searching for drug administrations with patient_id: ' . $patientId);

            // Build the query
            $query = DrugAdministration::where('patient_id', $patientId);

            // Debug: Check what records exist without filter
            $allRecords = DrugAdministration::all();
            // Get filtered results
            $administrations = $query->get();

            // Debug: Log the results
           if ($administrations->isEmpty()) {
                // Check if patient exists
                $patientExists = \App\Models\Patients\Patient::where('id', $patientId)->exists();
                Log::info('Patient exists: ' . ($patientExists ? 'Yes' : 'No'));

                // Check if any records have this patient_id (case-sensitive)
                $anyWithThisId = DrugAdministration::where('patient_id', (string)$patientId)->exists();
                Log::info('Records with this patient_id (as string): ' . ($anyWithThisId ? 'Yes' : 'No'));
            }

            return response()->json([
                'success' => true,
                'data' => $administrations,
                'count' => $administrations->count(),
                'message' => 'Drug administrations retrieved successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in drug administration index: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve drug administrations',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Store a new drug administration record
     */
    public function store(Request $request)
    {
        try {
            // Validate required fields
            $validated = $request->validate([
                'drug_name' => 'required|string|max:255',
                'administered_at' => 'required|date',
                'status' => 'required|in:swallowed,injected,vomitted,did_not_swallow,refused,partial',
                'patient_id' => 'required|exists:patients,id',
                'admission_number' => 'nullable|string',
                'prescription_uuid' => 'nullable|string',
                'dose' => 'nullable|string',
                'scheduledTime' => 'nullable|date',
                'signedBy' => 'nullable|string|max:255',
                'signature' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
            ]);

            DB::beginTransaction();

            // Create the administration record
            $administration = DrugAdministration::create([
                'patient_id' => $request->patient_id,
                'drug_id' => $request->drug_id,
                'drug_name' => $request->drug_name,
                'dose' => $request->dose,
                'administered_at' => $request->administered_at,
                'scheduled_time' => $request->scheduled_time,
                'signed_by' => $request->signed_by,
                'signature' => $request->signature,
                'status' => $request->status,
                'notes' => $request->notes,
                'prescription_uuid' => Str::uuid(),
                'admission_number' => $request->admission_number,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $administration,
                'message' => 'Drug administration recorded successfully'
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to record drug administration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific drug administration record
     */
    public function show($id)
    {
        try {
            $administration = DrugAdministration::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $administration,
                'message' => 'Drug administration retrieved successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Drug administration not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve drug administration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a drug administration record
     */
    public function update(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $administration = DrugAdministration::findOrFail($id);

            $administration->update([
                'dose' => $request->dose ?? $administration->dose,
                'administered_at' => $request->administeredAt ?? $administration->administered_at,
                'scheduled_time' => $request->scheduledTime ?? $administration->scheduled_time,
                'signed_by' => $request->signedBy ?? $administration->signed_by,
                'signature' => $request->signature ?? $administration->signature,
                'status' => $request->status ?? $administration->status,
                'notes' => $request->notes ?? $administration->notes,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $administration,
                'message' => 'Drug administration updated successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Drug administration not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update drug administration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a drug administration record
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $administration = DrugAdministration::findOrFail($id);
            $administration->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Drug administration deleted successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Drug administration not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete drug administration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get administration history for a specific drug
     */
    public function getDrugHistory(Request $request, $patientId, $drugId)
    {
        try {
            $administrations = DrugAdministration::where('patient_id', $patientId)
                ->where('drug_id', $drugId)
                ->orderBy('administered_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $administrations,
                'message' => 'Drug administration history retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve drug administration history',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
