<?php

namespace App\Http\Controllers\Patients;

use App\Helpers\MedicalDiagnosisHelper;
use App\Http\Controllers\Controller;
use App\Models\Patients\Admission;
use App\Models\Patients\Consultation;
use App\Models\Patients\Patient;
use App\Models\Patients\PatientVisitScheme;
use App\Models\Payments\Invoice;
use App\Models\Services\Service;
use App\Jobs\InteractionJob;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use App\Models\ICD10Dx\Diagnosis;
use App\Helpers\VisitTokenHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ConsultationController extends Controller
{
    protected $medicalDiagnosis;
    /**
     * Display a listing of the resource.
     */
    public function index(int $patientId)
    {
        $interactions  = Consultation::where('patient_id', $patientId)->get();
        return Inertia::render(
            'patients/consultation',
            ['recentInteractions' => $interactions]
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
        $visitToken   = VisitTokenHelper::getActiveToken($request->patient_id);

        /**
         * Add to invoice
         */



        if (!$visitToken) {
            return response()->json([
                'message' => 'Please start visit to save consultation!'
            ], 404);
        }
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'created_by' => 'nullable|exists:users,id',
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
            'doctors_id' => $validated['created_by'] ?? null,
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

            /**
             * Bill the consultation: resolve the service by the visit's payment
             * scheme + doctor (services.user_id) and append it to the visit invoice.
             * Wrapped so a billing problem can never break saving the consultation.
             */
            try {
                $this->addConsultationToInvoice(
                    $consultation,
                    (int) $validated['patient_id'],
                    $visitToken->token,
                    $validated['created_by'],
                    $isAdmitted ?: null
                );
            } catch (\Throwable $e) {
                Log::error('Consultation invoice update failed: ' . $e->getMessage(), [
                    'patient_id'        => $request->patient_id,
                    'consultation_uuid' => $consultation->consultation_uuid ?? null,
                    'visit_token'       => $visitToken->token,
                    'trace'             => $e->getTraceAsString(),
                ]);
            }

            InteractionJob::dispatch([
                'description' => 'New consultation created',
                'provider_id' => $request->created_by,
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

        $diagnosisDetails =  array_merge($patientDiagnosis, [
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

    // ================================================================
    // PRIVATE HELPERS
    // ================================================================

    /**
     * Add the consultation fee to the invoice of the active visit.
     *
     *  1. scheme_id  <- patient_visit_schemes (by visit token)
     *  2. service    <- services where user_id = doctor AND scheme_type = scheme_id
     *  3. If an invoice already exists for this visit token (draft/unpaid):
     *       - consultation already on it  -> do nothing (no insert, no change)
     *       - otherwise                   -> append the consultation item + update totals
     *     If no invoice exists            -> create one containing the consultation item.
     *
     * Returns the invoice, or null when nothing was inserted.
     */
    private function addConsultationToInvoice(
        Consultation $consultation,
        int $patientId,
        string $visitToken,
        int $doctorUserId,
        ?string $admissionNumber = null
    ): ?Invoice {

        // 1. Payment scheme selected for this visit
        $schemeId = PatientVisitScheme::where('token', $visitToken)->value('scheme_id');

        if (!$schemeId) {
            Log::warning('Consultation billing skipped: no payment scheme for visit', [
                'visit_token' => $visitToken,
                'patient_id'  => $patientId,
            ]);
            return null;
        }

        // 2. Consultation service for this doctor under that scheme
        $service = Service::where('user_id', $doctorUserId)
            ->where('scheme_type', $schemeId)
            ->orderBy('id')
            ->first();

        \Illuminate\Support\Facades\Log::info('user consulation found', [$service]);

        if (!$service) {
            Log::warning('Consultation billing skipped: no service found for doctor + scheme', [
                'user_id'     => $doctorUserId,
                'scheme_id'   => $schemeId,
                'visit_token' => $visitToken,
            ]);
            return null;
        }

        $price = (float) $service->price;

        $item = [
            'id'                  => $service->id,
            'service_id'          => $service->id,
            'service_name'        => $service->service_name,
            'name'                => $service->service_name,
            'category'            => $service->service_category ?? 'Consultation',
            'type'                => 'consultation',
            'consultation_uuid'   => $consultation->consultation_uuid,
            'quantity'            => 1,
            'price'               => $price,
            'unit_price'          => $price,
            'total'               => $price,
            'payment_status'      => 'pending',
        ];

        return DB::transaction(function () use ($patientId, $visitToken, $item, $price, $admissionNumber, $schemeId) {

            // Existing invoice for this visit token
            $invoice = Invoice::where('visit_token', $visitToken)
                ->where('patient_id', $patientId)
                ->whereIn('status', ['draft', 'unpaid'])
                ->lockForUpdate()
                ->first();

            if ($invoice) {
                $existingItems = $invoice->items ?? [];

                if (is_string($existingItems)) {
                    $existingItems = json_decode($existingItems, true) ?: [];
                }

                // Consultation already billed on this invoice -> leave it untouched
                $alreadyBilled = collect($existingItems)->contains(
                    fn($row) => ($row['type'] ?? null) === 'consultation'
                );

                if ($alreadyBilled) {
                    return null;
                }

                $merged   = array_merge($existingItems, [$item]);
                $newTotal = (float) $invoice->total + $price;
                $newDue   = $newTotal - (float) $invoice->paid_amount;

                $invoice->update([
                    'items'       => $merged,
                    'subtotal'    => $newTotal,
                    'total'       => $newTotal,
                    'due_amount'  => $newDue,
                    'items_count' => count($merged),
                    'updated_at'  => now(),
                ]);

                return $invoice->fresh();
            }

            // No invoice for this visit yet -> create one
            $patient = Patient::findOrFail($patientId);

            return Invoice::create([
                'visit_token'      => $visitToken,
                'invoice_number'   => Invoice::generateInvoiceNumber(),
                'patient_id'       => $patient->id,
                'user_id'          => auth()->id(),
                'admission_number' => $admissionNumber,
                'customer_name'    => $patient->name
                    ?? trim(($patient->first_name ?? '') . ' ' . ($patient->last_name ?? '')),
                'customer_email'   => $patient->email,
                'customer_phone'   => $patient->phone,
                'customer_address' => $patient->address ?? null,
                'subtotal'         => $price,
                'tax'              => 0,
                'discount'         => 0,
                'total'            => $price,
                'paid_amount'      => 0,
                'due_amount'       => $price,
                'currency'         => 'ZMW',
                'payment_scheme'   => $schemeId,
                'items'            => [$item],
                'items_count'      => 1,
                'issue_date'       => now(),
                'due_date'         => now()->addDays(30),
                'status'           => 'draft',
                'invoice_type'     => 'consultation',
            ]);
        });
    }
}
