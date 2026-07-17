<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\DTOs\PatientDTO;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Services\PatientService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use App\Models\Departments\Department;
use App\Helpers\VisitTokenHelper;
use App\MOdels\Patients\Interaction;
use App\Models\User;

class PatientController extends Controller
{
    protected $patientService;

    public function __construct(PatientService $patientService)
    {
        $this->patientService = $patientService;
    }

    /**
     * Show the patient registration form
     */
    public function create()
    {
        return Inertia::render('receptions/create');
    }

    /**
     * Store a new patient (for Inertia form submissions)
     */
    public function store(Request $request)
    {
        try {
            // Validate request using DTO rules
            $validated = $request->validate(PatientDTO::validationRules());

            // Add profile photo if present
            if ($request->hasFile('profile_photo')) {
                $validated['profile_photo'] = $request->file('profile_photo');
            }

            Log::info('Patient registration data received', $validated);

            // Create DTO from validated data
            $patientDTO = PatientDTO::fromRequest($validated);

            // Call service with DTO data
            $result = $this->patientService->createPatient($patientDTO->toArray());

            if (!$result['success']) {
                return redirect()->back()
                    ->withErrors(['error' => $result['message']])
                    ->withInput();
            }

            Log::info('Patient registered successfully via web', [
                'patient_id' => $result['data']->id,
                'patient_number' => $result['data']->patient_number
            ]);

            return response()->json([
                'status' => 200
            ]); 

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status' => 300,
                'message' => $e->getMessage()
            ]);
        } catch (\Exception $e) {
            

             return response()->json([
                'status' => 300,
                'message' => $e->getMessage()
            ]);
        }
    }

    /**
     * API Search patients (for the reception search with type filtering)
     */
    public function search(Request $request): JsonResponse
    {

        try {
            $query = $request->input('query');
            $type = $request->input('type');
            $result = $this->patientService->searchPatientsAPI($query, $type);

            return response()->json([
                'success' => true,
                'data' => $result['data'],
            ]);
        } catch (\Exception $e) {
            Log::error('Patient search API failed', [
                'query' => $request->input('query'),
                'type' => $request->input('type'),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to search patients',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show patient details
     */
    public function show($id)
    {
        $result = $this->patientService->getPatientById($id);

        if (!$result['success']) {
            return redirect()->back()->with('error', $result['message']);
        }

        // Get visit status using the helper
        $hasActiveVisit = VisitTokenHelper::hasActiveVisit($id);
        $activeToken = VisitTokenHelper::getActiveTokenArray($id);

        // Convert to DTO for consistent data structure
        $patientDTO = PatientDTO::fromModel($result['data']);

        $interactions = Interaction::where('patient_id', $id)
            ->with('provider')
            ->get();

        return Inertia::render('patients/show', [
            'patient' => $patientDTO->toArray(),
            'departments' => Department::all(),
            'users' => User::all(),
            'interactions' => $interactions,
            // Add visit status to props
            'visit_status' => [
                'has_active_visit' => $hasActiveVisit,
                'visit_token' => $activeToken ? $activeToken['token'] : null,
                'token_details' => $activeToken
            ]
        ]);
    }

    /**
     * Show edit form
     */
    public function edit($id)
    {
        $result = $this->patientService->getPatientById($id);

        if (!$result['success']) {
            return redirect()->back()->with('error', $result['message']);
        }

        // Convert to DTO for consistent data structure
        $patientDTO = PatientDTO::fromModel($result['data']);

        return Inertia::render('patients/edit', [
            'patient' => $patientDTO->toArray()
        ]);
    }

    /**
     * Update patient
     */
    public function update(Request $request, $id)
    {
        try {
            // Validate request using DTO rules
            $validated = $request->validate(PatientDTO::validationRules());

            // Add profile photo if present
            if ($request->hasFile('profile_photo')) {
                $validated['profile_photo'] = $request->file('profile_photo');
            }

            // Create DTO from validated data
            $patientDTO = PatientDTO::fromRequest($validated);

            $result = $this->patientService->updatePatient($id, $patientDTO->toArray());

            if (!$result['success']) {
                return redirect()->back()
                    ->withErrors(['error' => $result['message']])
                    ->withInput();
            }

            return redirect()->route('patients.show', $id)
                ->with('success', 'Patient updated successfully!');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return redirect()->back()
                ->withErrors($e->errors())
                ->withInput();
        } catch (\Exception $e) {
            Log::error('Patient update failed', [
                'patient_id' => $id,
                'error' => $e->getMessage()
            ]);

            return redirect()->back()
                ->with('error', 'Failed to update patient.')
                ->withInput();
        }
    }

    /**
     * Delete patient
     */
    public function destroy($id)
    {
        try {
            $result = $this->patientService->deletePatient($id);

            if (!$result['success']) {
                return redirect()->back()->with('error', $result['message']);
            }

            return redirect('/reception')
                ->with('success', 'Patient deleted successfully!');
        } catch (\Exception $e) {
            Log::error('Patient deletion failed', [
                'patient_id' => $id,
                'error' => $e->getMessage()
            ]);

            return redirect()->back()->with('error', 'Failed to delete patient.');
        }
    }

    /**
     * Restore soft-deleted patient
     */
    public function restore($id)
    {
        try {
            $result = $this->patientService->restorePatient($id);

            if (!$result['success']) {
                return redirect()->back()->with('error', $result['message']);
            }

            return redirect()->route('patients.show', $id)
                ->with('success', 'Patient restored successfully!');
        } catch (\Exception $e) {
            Log::error('Patient restoration failed', [
                'patient_id' => $id,
                'error' => $e->getMessage()
            ]);

            return redirect()->back()->with('error', 'Failed to restore patient.');
        }
    }
}
