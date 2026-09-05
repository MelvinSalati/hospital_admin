<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\DTOs\PatientDTO;
use Illuminate\Support\Facades\Log;
use App\Services\Patients\PatientService;
use App\Models\Patients\Patient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use App\Models\Departments\Department;
use App\Helpers\VisitTokenHelper;
use App\Models\Patients\Interaction;
use App\Models\User;
use Illuminate\Validation\ValidationException;
use App\Models\Patients\InsuranceProvider;
use App\Models\Patients\PatientVisitScheme;
use App\Models\Services\Service;
use App\Models\Patients\PatientProcedure;
use App\Models\Patients\PatientProcedureItem;
use App\Models\Payments\Invoice;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;



class PatientController extends Controller
{
    protected PatientService $patientService;
    protected   $selectedScheme;
    protected  $token;

    public function __construct(PatientService $patientService)
    {
        $this->token     = new VisitTokenHelper();
        $this->patientService = $patientService;
    }

    /**
     * Show the patient registration form
     */
    public function create()
    {
        return Inertia::render('receptions/create' , [
            'insuranceProviders' => InsuranceProvider::all()
        ]);
    }

    /**
     * Store a new patient (for Inertia form submissions)
     */
    public function store(Request $request)
    {

        try {
            // Get all request data
            $data = $request->all();

            // Handle profile_photo - remove if empty array or null
            if (isset($data['profile_photo']) && empty($data['profile_photo'])) {
                unset($data['profile_photo']);
            }

            // Generate patient number if not set
            if (empty($data['patient_number'])) {
                $data['patient_number'] = 'AMH-'.Carbon::now()->format('Ym').'-'.rand(00000,99999);
            }

            // Add profile photo if present and is a valid file
            if ($request->hasFile('profile_photo')) {
                $data['profile_photo'] = $request->file('profile_photo');
            }

            // Remove null values, empty arrays, and empty strings to avoid SQL issues
            $data = array_filter($data, function ($value) {
                if (is_array($value) && empty($value)) {
                    return false;
                }
                return $value !== null && $value !== '';
            });

            // Create the patient
            $patient = Patient::create($data);

            dispatch(new \App\Jobs\Patients\RegistrationJob(
                $patient->first_name,
                $patient->patient_number,
                $patient->phone
            ));
            Log::info('Patient registered successfully via web', [
                'patient_id' => $patient->id,
                'patient_number' => $patient->patient_number
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Patient registered successfully',
                'data' => $patient,
            ],201);
        } catch (\Exception $e) {
            Log::error('Patient registration failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to register patient: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Search patients with filters (for the registry search)
     */
    // public function search(Request $request)
    // {
    //     return $request;

    // }

    /**
     * API Search patients (for the reception search with type filtering)
     */
    public function search(Request $request): JsonResponse
    {
        $start = microtime(true);

        try {
            $validated = $request->validate([
                'search_type' => [
                    'required',
                    'in:phone,name,nrc,patient_number',
                ],
                'search_value' => [
                    'required',
                    'string',
                    'min:2',
                    'max:100',
                ],
            ]);

            $afterValidation = microtime(true);

            $patients = $this->patientService->searchPatient($validated);

            $afterService = microtime(true);

            $response = response()->json([
                'success' => true,
                'data' => $patients,
            ]);

            $afterResponse = microtime(true);

            $timing = [
                'validation_ms' => round(
                    ($afterValidation - $start) * 1000,
                    2
                ),

                'service_ms' => round(
                    ($afterService - $afterValidation) * 1000,
                    2
                ),

                'response_ms' => round(
                    ($afterResponse - $afterService) * 1000,
                    2
                ),

                'controller_total_ms' => round(
                    ($afterResponse - $start) * 1000,
                    2
                ),
            ];

            Log::info('PATIENT SEARCH PERFORMANCE', $timing);

            return $response;
        } catch (\Throwable $e) {

            Log::error('Patient search API failed', [
                'search_value' => $request->input('search_value'),
                'search_type' => $request->input('search_type'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to search patients',
            ], 500);
        }
    }

    /**
     * Show patient details
     */

    public function getPatientDetails(string $patientUuid){
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        return Inertia::render('patients/show',[
            'patient' => $this->patientService->patient($patientUuid),
            'insuranceProviders' => InsuranceProvider::all()
        ]);
    }
    public function show($Id)
    {
        try {
            $result = $this->patientService->getPatientById($Id);
            Log::info($result);
            if (!$result['success']) {
                return redirect()->back()->with('error', $result['message']);
            }

            // Get visit status using the helper
            $hasActiveVisit = VisitTokenHelper::hasActiveVisit($Id);
            $activeToken = VisitTokenHelper::getActiveTokenArray($Id);

            // Convert to DTO for consistent data structure
            $patientDTO = PatientDTO::fromModel($result['data']);

            $interactions = Interaction::where('patient_id', $Id)
                ->with('provider')
                ->get();

            return Inertia::render('patients/show', [
                'patient' => $patientDTO->toArray(),
                'departments' => Department::all(),
                'users' => User::all(),
                'interactions' => $interactions,
                'visit_status' => [
                    'has_active_visit' => $hasActiveVisit,
                    'visit_token' => $activeToken ? $activeToken['token'] : null,
                    'token_details' => $activeToken
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to show patient', [
                'patient_id' => $Id,
                'error' => $e->getMessage()
            ]);

            return redirect()->back()->with('error', 'Failed to load patient details.');
        }
    }

    /**
     * Show edit form
     */
    public function edit($Id)
    {
        try {
            $result = $this->patientService->getPatientById($Id);

            if (!$result['success']) {
                return redirect()->back()->with('error', $result['message']);
            }

            // Convert to DTO for consistent data structure
            $patientDTO = PatientDTO::fromModel($result['data']);

            return Inertia::render('patients/edit', [
                'patient' => $patientDTO->toArray()
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to load patient edit form', [
                'patient_id' => $Id,
                'error' => $e->getMessage()
            ]);

            return redirect()->back()->with('error', 'Failed to load patient data.');
        }
    }

    /**
     * Update patient
     */
    public function update(Request $request, $Id)
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

            $result = $this->patientService->updatePatient($Id, $patientDTO->toArray());

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'errors' => $result['errors'] ?? null
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Patient updated successfully!',
                'data' => $result['data'],
                'redirect' => route('patients.show', $Id)
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Patient update failed', [
                'patient_id' => $Id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update patient: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete patient
     */
    public function destroy($Id)
    {
        try {
            $result = $this->patientService->deletePatient($Id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message']
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Patient deleted successfully!',
                'redirect' => '/reception'
            ]);
        } catch (\Exception $e) {
            Log::error('Patient deletion failed', [
                'patient_id' => $Id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete patient: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Restore soft-deleted patient
     */
    public function restore($Id)
    {
        try {
            $result = $this->patientService->restorePatient($Id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message']
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Patient restored successfully!',
                'redirect' => route('patients.show', $Id)
            ]);
        } catch (\Exception $e) {
            Log::error('Patient restoration failed', [
                'patient_id' => $Id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to restore patient: ' . $e->getMessage()
            ], 500);
        }
    }

    public function procedures(int $Id){
       try
       {
         return Inertia::render('patients/procedures',$this->getProcedures($Id));
       }catch(\Exception $e){
             return Inertia::render('patients/procedures',[
            'error' => $e->getMessage(),
        ]);
       }
    }


    public function getProcedures(int $Id):array {
        $hasActiveVisit = VisitTokenHelper::hasActiveVisit($Id);
        $activeToken = VisitTokenHelper::getActiveTokenArray($Id);
    Log::info([$activeToken]);
        if (!$hasActiveVisit || !$activeToken) {
            return [
                'previousProcedures' => []
            ];
        }

        $schemeSelected = PatientVisitScheme::where('token', $activeToken['token'])
            ->value('scheme_id');

        return [
            'procedures' => Service::where('scheme_type', $schemeSelected)
                ->whereNotIn('service_category', ['Laboratory', 'Drugs','Imaging','Procedures'])
                ->get(),
            'previousProcedures' => PatientProcedureItem::where('patient_id', $Id)->get(),
            'patientId' => $Id
        ];
    }

    public function addProcedure(Request $request, int $patientId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'procedure_id' => 'required|integer|exists:services,id',
                'items' => 'required|array|min:1',
                'items.*.item_id' => 'required|integer',
                'items.*.name' => 'required|string',
                'items.*.quantity' => 'required|numeric|min:1',
                'items.*.unit' => 'nullable|string',
                'items.*.price' => 'required|numeric|min:0',
                'items.*.total' => 'required|numeric|min:0',
            ]);

            Log::info('Validated procedure data', $validated);

            /*
        |--------------------------------------------------------------------------
        | 1. GET ACTIVE PATIENT VISIT
        |--------------------------------------------------------------------------
        */
            $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);

            Log::info('Active token check', [
                'patient_id' => $patientId,
                'activeToken' => $activeToken
            ]);

            if (!$activeToken || empty($activeToken['token'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please start a visit to continue.',
                ], 422);
            }

            $visitToken = $activeToken['token'];

            /*
        |--------------------------------------------------------------------------
        | 2. FIND OR CREATE ACTIVE INVOICE
        |--------------------------------------------------------------------------
        */
            $invoice = Invoice::where('patient_id', $patientId)
                ->where('visit_token', $visitToken)
                ->whereIn('status', ['draft', 'unpaid'])
                ->first();

            Log::info('Invoice check', [
                'patient_id' => $patientId,
                'visit_token' => $visitToken,
                'invoice_found' => $invoice ? true : false,
                'invoice_id' => $invoice ? $invoice->id : null
            ]);

            // Create invoice if it doesn't exist
            if (!$invoice) {
                $invoice = Invoice::create([
                    'patient_id' => $patientId,
                    'visit_token' => $visitToken,
                    'status' => 'draft',
                    'items' => [],
                    'subtotal' => 0,
                    'tax' => 0,
                    'discount' => 0,
                    'total' => 0,
                    'due_amount' => 0,
                    'paid_amount' => 0,
                ]);

                Log::info('New invoice created', [
                    'invoice_id' => $invoice->id,
                    'patient_id' => $patientId
                ]);
            }

            /*
        |--------------------------------------------------------------------------
        | 3. CHECK FOR DUPLICATE ITEMS
        |--------------------------------------------------------------------------
        */
            // Get existing procedure items for this patient and visit
            $existingItems = PatientProcedureItem::where('patient_id', $patientId)
                ->where('visit_token', $visitToken)
                ->where('procedure_id', $validated['procedure_id'])
                ->pluck('item_id')
                ->toArray();

            Log::info('Existing items check', [
                'existing_items' => $existingItems,
                'new_items' => array_column($validated['items'], 'item_id')
            ]);

            // Filter out duplicate items
            $newItems = [];
            $duplicateItems = [];

            foreach ($validated['items'] as $item) {
                if (in_array($item['item_id'], $existingItems)) {
                    $duplicateItems[] = $item['item_id'];
                } else {
                    $newItems[] = $item;
                }
            }

            // If all items are duplicates, return error
            if (empty($newItems)) {
                return response()->json([
                    'success' => false,
                    'message' => 'All items have already been added to this procedure.',
                    'duplicate_items' => $duplicateItems
                ], 422);
            }

            // If some items are duplicates, log them and continue with new items only
            if (!empty($duplicateItems)) {
                Log::warning('Duplicate items skipped', [
                    'patient_id' => $patientId,
                    'procedure_id' => $validated['procedure_id'],
                    'duplicate_items' => $duplicateItems
                ]);
            }

            /*
        |--------------------------------------------------------------------------
        | 4. INSERT PROCEDURE ITEMS (only new ones)
        |--------------------------------------------------------------------------
        */
            $invoiceItems = $invoice->items ?? [];

            if (is_string($invoiceItems)) {
                $invoiceItems = json_decode($invoiceItems, true) ?? [];
            }

            $createdItems = [];

            DB::transaction(function () use ($newItems, $validated, $patientId, $invoice, $visitToken, &$createdItems, &$invoiceItems) {
                foreach ($newItems as $item) {
                    $procedureItem = PatientProcedureItem::create([
                        'patient_id' => $patientId,
                        'invoice_id' => $invoice->id,
                        'procedure_id' => $validated['procedure_id'],
                        'visit_token' => $visitToken,
                        'item_id' => $item['item_id'],
                        'name' => $item['name'],
                        'quantity' => $item['quantity'],
                        'unit' => $item['unit'] ?? null,
                        'price' => $item['price'],
                        'total' => $item['total'],
                    ]);

                    $createdItems[] = $procedureItem;

                    /*
                |--------------------------------------------------------------------------
                | 5. APPEND ITEM TO INVOICE JSON
                |--------------------------------------------------------------------------
                */
                    $invoiceItems[] = [
                        'id' => $item['item_id'],
                        'name' => $item['name'],
                        'quantity' => (float) $item['quantity'],
                        'unit' => $item['unit'] ?? null,
                        'price' => (float) $item['price'],
                        'total' => (float) $item['total'],
                        'type' => 'procedure',
                        'procedure_id' => $validated['procedure_id'],
                        'patient_procedure_item_id' => $procedureItem->id,
                    ];
                }

                /*
            |--------------------------------------------------------------------------
            | 6. RECALCULATE INVOICE
            |--------------------------------------------------------------------------
            */
                $subtotal = collect($invoiceItems)->sum('total');

                $tax = round($subtotal * 0.05, 2);
                $discount = (float) ($invoice->discount ?? 0);
                $total = round($subtotal + $tax - $discount, 2);
                $paidAmount = (float) ($invoice->paid_amount ?? 0);
                $dueAmount = max($total - $paidAmount, 0);

                /*
            |--------------------------------------------------------------------------
            | 7. UPDATE INVOICE
            |--------------------------------------------------------------------------
            */
                $invoice->update([
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'discount' => $discount,
                    'total' => $total,
                    'due_amount' => $dueAmount,
                    'items' => $invoiceItems,
                ]);
            });

            /*
        |--------------------------------------------------------------------------
        | 8. RESPONSE
        |--------------------------------------------------------------------------
        */
            $message = 'Procedure items added successfully.';
            if (!empty($duplicateItems)) {
                $message = count($newItems) > 0
                    ? 'Some items were added. ' . count($duplicateItems) . ' duplicate item(s) were skipped.'
                    : 'All items were duplicates and have been skipped.';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'items' => $createdItems,
                    'invoice' => $invoice->fresh(),
                    'duplicates_skipped' => $duplicateItems,
                    'new_items_added' => count($createdItems),
                    'total_items_requested' => count($validated['items'])
                ],
            ]);
        } catch (ValidationException $e) {
            Log::error('Validation failed for addProcedure', [
                'patient_id' => $patientId,
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Failed to add procedure items', [
                'patient_id' => $patientId,
                'procedure_id' => $request->input('procedure_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to add procedure items: ' . $e->getMessage(),
            ], 500);
        }
    }
}
