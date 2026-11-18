<?php

namespace App\Http\Controllers\Laboratories;

use App\Jobs\ProcessLabResultOcrJob;
use App\Http\Controllers\Controller;
use App\Models\Patients\LabOrder;
use App\Models\Laboratory\TestConfig;
use App\Models\Laboratory\TestCategory;
use App\Models\Laboratories\LabResultFile;
use App\Models\Patients\Patient;
use App\Models\User;
use App\Notifications\LabResultsReadyNotification;
use App\Services\Laboratories\LaboratoryService;
use App\Services\Laboratories\LabResultPdfService;
use Smalot\PdfParser\Parser;
use App\Services\QueueService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Models\Patients\LabOrder as PatientsLabOrder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;
use App\Services\Invoices\InvoiceService;
use Inertia\Inertia;
use Carbon\Carbon;
use Throwable;

class LaboratoryController extends Controller
{
    protected $labsService;
    protected $queueService;
    protected LabResultPdfService $labResultPdfService;

    public function __construct(
        LaboratoryService $labsService,
        QueueService $queueService,
        LabResultPdfService $labResultPdfService
    ) {
        $this->labsService = $labsService;
        $this->queueService = $queueService;
        $this->labResultPdfService = $labResultPdfService;
    }

    public function laboratoryQueue()
    {
        $doneStatuses = ['completed', 'reported', 'performed', 'cancelled'];

        $inProgress = PatientsLabOrder::query()
            ->with(['patient', 'orderedBy'])
            ->whereNotIn('status', $doneStatuses)
            ->orderBy('ordered_date', 'asc')
            ->limit(50)
            ->get();

        // Separate query, so a long completed history can never push pending
        // orders out of the limit.
        $completed = PatientsLabOrder::query()
            ->with(['patient', 'orderedBy'])
            ->whereIn('status', $doneStatuses)
            ->orderByDesc('completed_date')
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get();

        $orders   = $inProgress->concat($completed)->values();
        $orderIds = $orders->pluck('id');

        // Ordered tests per order
        $itemsByOrder = DB::table('lab_order_items')
            ->whereIn('lab_order_id', $orderIds)
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get()
            ->groupBy('lab_order_id');

        // Uploaded result files per order
        $filesByOrder = DB::table('lab_result_files')
            ->whereIn('lab_order_id', $orderIds)
            ->get(['lab_order_id', 'processing_status'])
            ->groupBy('lab_order_id');

        // Fallback: if neither lab_orders nor lab_order_items has an invoice_id
        // column, look the invoice up by visit token.
        // !! Adjust table/column names to your schema, or delete this block. !!
        $invoiceIdsByToken = collect();
        if (Schema::hasTable('invoices') && Schema::hasColumn('invoices', 'visit_token')) {
            $invoiceIdsByToken = DB::table('invoices')
                ->whereIn('visit_token', $orders->pluck('visit_token')->filter()->unique())
                ->orderBy('id')
                ->pluck('id', 'visit_token');
        }

        return Inertia::render('laboratories/laboratory', [
            'queue' => $orders
                ->map(fn($o) => $this->mapQueueRow(
                    $o,
                    $itemsByOrder->get($o->id, collect()),
                    $filesByOrder->get($o->id, collect()),
                    $invoiceIdsByToken,
                ))
                ->values(),
        ]);
    }

    /**
     * Shape one lab order into the QueuePatient row that
     * resources/js/pages/laboratory/Nurses.tsx expects.
     */
    private function mapQueueRow(PatientsLabOrder $order, $items, $files, $invoiceIdsByToken = null): array
    {
        $patient = $order->patient;

        // Invoice id: lab_orders.invoice_id -> lab_order_items.invoice_id -> invoices.visit_token
        $invoiceId = $order->invoice_id
            ?? $items->pluck('invoice_id')->filter()->first()
            ?? ($invoiceIdsByToken[$order->visit_token] ?? null);

        $tests = $items->isNotEmpty()
            ? $items->map(fn($item) => [
                'item_id'         => $item->id,
                'invoice_id'      => $item->invoice_id ?? $invoiceId,
                'test_name'       => $item->test_name,
                'unit_price'      => (string) ($item->unit_price ?? 0),
                'quantity'        => (int) ($item->quantity ?? 1),
                'total_price'     => (string) ($item->total_price ?? 0),
                'amount'          => (float) ($item->total_price ?? 0),
                'status'          => $item->status ?? 'pending',
                'result_value'    => $item->result_value,
                'reference_range' => $item->reference_range,
                'unit'            => $item->unit,
                'interpretation'  => $item->interpretation,
                'result_file'     => null,
            ])->values()
            // Older orders have no lab_order_items rows: fall back to the order's own test
            : collect([[
                'item_id'     => null,
                'invoice_id'  => $invoiceId,
                'test_name'   => $order->test_name ?? 'Laboratory test',
                'unit_price'  => (string) ($order->total_amount ?? 0),
                'quantity'    => 1,
                'total_price' => (string) ($order->total_amount ?? 0),
                'amount'      => (float) ($order->total_amount ?? 0),
                'status'      => strtolower((string) $order->status) === 'completed' ? 'completed' : 'pending',
            ]]);

        $status = strtolower((string) $order->status);

        // Processed = finished/cancelled, or a result file was parsed successfully
        $processed = in_array($status, ['completed', 'reported', 'performed', 'cancelled'], true)
            || $files->contains(fn($f) => $f->processing_status === 'completed');

        // Sex/Age string, e.g. "M/34" (the frontend reads the first letter)
        $gender = $patient?->gender ? ucfirst($patient->gender) : null;
        $sexAge = $gender && $patient?->date_of_birth
            ? $gender[0] . '/' . \Carbon\Carbon::parse($patient->date_of_birth)->age
            : $gender;

        return [
            'id'             => $patient?->id ?? $order->patient_id,
            'lab_order_id'   => $order->id,
            'invoice_id'     => $invoiceId,
            'token'          => (string) ($order->visit_token ?? ''),
            'visit_token'    => $order->visit_token,
            'first_name'     => $patient?->first_name ?? '',
            'last_name'      => $patient?->last_name ?? '',
            'gender'         => $sexAge,
            'patient_number' => $patient?->patient_number,
            'photo_url'      => $patient?->photo_url ?? null,
            'status'         => $processed
                ? ($status === 'cancelled' ? 'cancelled' : 'completed')
                : ($order->status ?: 'pending'),
            'processed'      => $processed,
            'created_at'     => (string) ($order->ordered_date ?? $order->created_at),
            'ordered_by'     => $order->orderedBy?->name ?? 'system',
            'total_amount'   => $tests->sum('amount') ?: (float) ($order->total_amount ?? 0),
            'tests'          => $tests,
        ];
    }


    public function dashboard()
    {
        return Inertia::render('laboratories/dashboard', []);
    }

    public function reports()
    {
        return Inertia::render('laboratories/logistics');
    }

    public function processed()
    {
        $queue = LabOrder::query()
            ->where('status', 'completed')
            ->whereExists(function ($query) {
                $query->selectRaw('1')
                    ->from('lab_result_files as lrf')
                    ->join(
                        'lab_result_items as lri',
                        'lri.lab_result_id',
                        '=',
                        'lrf.id'
                    )
                    ->whereColumn('lrf.lab_order_id', 'lab_orders.id')
                    ->whereColumn('lri.lab_result_id', 'lrf.id');
            })
            ->with([
                'patient:id,first_name,last_name,gender,patient_number',
                'orderedBy:id,name',
                'processor:id,name',
            ])
            ->get()
            ->map(function ($order) {
                $items = \Illuminate\Support\Facades\DB::table('lab_result_files as lrf')
                    ->join(
                        'lab_result_items as lri',
                        'lri.lab_result_id',
                        '=',
                        'lrf.id'
                    )
                    ->where('lrf.lab_order_id', $order->id)
                    ->select([
                        'lri.id',
                        'lri.lab_result_id',
                        'lri.test_name',
                        'lri.value',
                        'lri.value_numeric',
                        'lri.unit',
                        'lri.flag',
                        'lri.ref_low',
                        'lri.ref_high',
                        'lri.verified_by',
                        'lri.verified_at',
                        'lrf.id as result_file_id',
                        'lrf.original_name',
                        'lrf.path',
                        'lrf.mime_type',
                        'lrf.report_no',
                        'lrf.created_at as file_uploaded_at',
                    ])
                    ->get();

                return [
                    'id' => $order->patient?->id,
                    'lab_order_id' => $order->id,
                    'token' => $order->token ?? $order->visit_token ?? null,
                    'first_name' => $order->patient?->first_name,
                    'last_name' => $order->patient?->last_name,
                    'gender' => $order->patient?->gender,
                    'patient_number' => $order->patient?->patient_number,
                    'status' => $order->status,
                    'created_at' => $order->created_at?->toIso8601String(),
                    'ordered_by' => $order->orderedBy?->name,
                    'total_amount' => $order->total_amount,

                    'tests' => $items->map(fn($item) => [
                        'id' => $item->id,
                        'test_name' => $item->test_name,
                        'result_value' => $item->value,
                        'value_numeric' => $item->value_numeric,
                        'unit' => $item->unit,
                        'flag' => $item->flag,
                        'reference_range' => $item->ref_low !== null
                            || $item->ref_high !== null
                            ? trim(
                                ($item->ref_low ?? '') . ' - ' .
                                    ($item->ref_high ?? ''),
                                ' -'
                            )
                            : null,
                        'verified_by' => $item->verified_by,
                        'verified_at' => $item->verified_at,
                        'result_file' => [
                            'id' => $item->result_file_id,
                            'original_name' => $item->original_name,
                            'path' => $item->path,
                            'mime_type' => $item->mime_type,
                            'report_no' => $item->report_no,
                            'uploaded_at' => $item->file_uploaded_at,
                        ],
                    ])->values()->toArray(),

                    'processed_by' => $order->processed_by
                        ? [
                            'id' => $order->processed_by,
                            'name' => $order->processor?->name,
                            'role' => $order->processor?->role,
                            'processed_at' => $order->processing_date
                                ? \Illuminate\Support\Carbon::parse(
                                    $order->processing_date
                                )->toIso8601String()
                                : null,
                            'files_uploaded' => $items
                                ->pluck('result_file_id')
                                ->unique()
                                ->count(),
                        ]
                        : null,
                ];
            })
            ->values();

        return Inertia::render('laboratories/processed', [
            'queue' => $queue,
        ]);
    }

    public function logistics()
    {
        return Inertia::render('laboratories/logistics');
    }

    public function orders()
    {
        return Inertia::render('laboratories/orders');
    }

    public function settings()
    {
        $tests = TestConfig::with('parameters')->get();

        $categories = TestCategory::all();

        return Inertia::render('laboratories/settings', [
            'tests' => $tests,
            'categories' => $categories,
        ]);
    }

    public function index()
    {
        $laboratoryItems = LabOrder::join(
            'lab_order_items',
            'lab_orders.id',
            '=',
            'lab_order_items.lab_order_id'
        )
            ->join(
                'patients',
                'patients.id',
                '=',
                'lab_orders.patient_id'
            )
            ->leftJoin(
                'lab_result_files',
                'lab_orders.id',
                '=',
                'lab_result_files.lab_order_id'
            )
            ->whereNull('lab_result_files.lab_order_id')
            ->select(
                'lab_orders.*',
                'lab_order_items.*',
                'patients.*'
            )
            ->limit(4)
            ->get();

        return Inertia::render('laboratories/laboratory', [
            'queue' => $laboratoryItems->map(function ($items) use ($laboratoryItems) {
                $gender = ucfirst($items->gender);

                $tests = $laboratoryItems
                    ->where('lab_order_id', $items->lab_order_id)
                    ->map(fn($item) => [
                        'test_name'   => $item->test_name,
                        'unit_price'  => $item->unit_price,
                        'quantity'    => $item->quantity,
                        'total_price' => $item->total_price,
                        'status'      => $item->status,
                        'amount'      => (float) $item->total_price,
                    ])
                    ->values();

                return [
                    'id'           => $items->patient_id,
                    'first_name'   => $items->first_name,
                    'last_name'    => $items->last_name,
                    'gender'       => $gender[0] . '/' . Carbon::parse($items->date_of_birth)->age,
                    'tests'        => $tests,
                    'token'        => $items->visit_token,
                    'lab_order_id' => $items->lab_order_id,
                    'total_amount' => $tests->sum('amount'),
                    'ordered_by'   => 'system',
                ];
            }),
        ]);
    }

    public function getlaboratoryTests()
    {
        return $this->labsService->getAllLaboratoryTests();
    }

    public function enterResults(Request $request, $orderId)
    {
        try {
            $results   = $request->input('results');
            $patientId = $request->input('patient_id');

            if (!$results || !is_array($results)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid results data format'
                ], 400);
            }

            $insertedResults = [];

            foreach ($results as $result) {
                $inserted = DB::table('lab_results')->insert([
                    'order_id'       => $orderId,
                    'test_id'        => $result['test_id'],
                    'patient_id'     => $patientId,
                    'result_value'   => $result['result_value'],
                    'unit'           => $result['unit'] ?? null,
                    'abnormal_flag'  => $result['abnormal_flag'] ?? 'normal',
                    'interpretation' => $result['interpretation'] ?? null,
                    'notes'          => $result['notes'] ?? null,
                    'performed_by'   => auth()->id(),
                    'performed_date' => now(),
                    'status'         => 'completed',
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);

                if ($inserted) {
                    $insertedResults[] = $result['test_id'];

                    DB::table('lab_order_items')
                        ->where('lab_order_id', $orderId)
                        ->where('test_id', $result['test_id'])
                        ->update([
                            'status'              => 'completed',
                            'result_entered_date' => now(),
                            'updated_at'          => now()
                        ]);
                }
            }

            // Check if all tests in the order are completed.
            $pendingTests = DB::table('lab_order_items')
                ->where('lab_order_id', $orderId)
                ->where('status', '!=', 'completed')
                ->count();

            if ($pendingTests === 0) {
                DB::table('lab_orders')
                    ->where('id', $orderId)
                    ->update([
                        'status'     => 'completed',
                        'updated_at' => now()
                    ]);
            } else {
                DB::table('lab_orders')
                    ->where('id', $orderId)
                    ->update([
                        'status'     => 'processing',
                        'updated_at' => now()
                    ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Results saved successfully',
                'data'    => $insertedResults
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error saving lab results: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to save results: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process uploaded PDF reports using the existing LabResultPdfService.
     *
     * $userId is the patient ID used by the existing route.
     * $lab_order_id is the laboratory order ID.
     */
    public function uploadResults(
        Request $request,
        int $userId,
        int $patientId,
        int $lab_order_id
    ) {
        $validated = $request->validate([
            'pdfs'         => ['required', 'array', 'min:1'],
            'pdfs.*'       => ['required', 'file', 'mimes:pdf', 'max:10240'],
            'test_names'   => ['required', 'array', 'min:1'],
            'test_names.*' => ['required', 'string', 'max:255'],
        ]);

        try {
            $order = LabOrder::find($lab_order_id);
            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Laboratory order not found.',
                ], 404);
            }

            if (!Patient::whereKey($patientId)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Patient not found.',
                ], 404);
            }

            $saved = [];

            foreach ($request->file('pdfs', []) as $pdf) {
                if (!$pdf instanceof UploadedFile) {
                    continue;
                }

                // ▶▶▶ The new method is consumed here ◀◀◀
                $saved[] = $this->labResultPdfService->storeAndComplete(
                    $pdf,
                    $lab_order_id,
                    $userId,
                    $validated['test_names'],
                );
            }

            // Optional: tell the ordering doctor the results are ready
            $this->notifyOrdererOfResults($lab_order_id, $saved);

            return response()->json([
                'success' => true,
                'message' => count($saved) . ' file(s) uploaded and marked as processed.',
                'files'   => collect($saved)->map(fn($f) => [
                    'file_id'       => $f->id,
                    'original_name' => $f->original_name,
                    'status'        => $f->processing_status,
                ])->values(),
            ], 201);
        } catch (Throwable $e) {
            Log::error('Lab result upload failed', [
                'user_id'      => $userId,
                'patient_id'   => $patientId,
                'lab_order_id' => $lab_order_id,
                'error'        => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to save upload: ' . $e->getMessage(),
            ], 500);
        }
    }
    /**
     * Match a parsed result name to an ordered test.
     */
    private function matchOrderItem(string $name, $orderItems)
    {
        $normalize = fn($value) => preg_replace(
            '/[^a-z0-9]/',
            '',
            strtolower(trim((string) $value))
        );

        $needle = $normalize($name);

        if ($needle === '') {
            return null;
        }

        $best = null;
        $bestScore = 0;

        foreach ($orderItems as $item) {
            $haystack = $normalize($item->test_name);

            if ($needle === $haystack) {
                return $item;
            }

            similar_text($needle, $haystack, $percentage);

            if ($percentage > $bestScore) {
                $bestScore = $percentage;
                $best = $item;
            }
        }

        return $bestScore >= 85 ? $best : null;
    }

    /**
     * Check whether the selected patient's first and last names are present
     * in the extracted report text.
     *
     * This uses the text returned by the existing PDF service. It does not
     * assume that the service exposes a separate header() method.
     */
    private function checkPatientMatch($patient, string $ocrText): array
    {
        if (!$patient) {
            return [
                'matched' => false,
                'reason' => 'Selected patient was not found',
            ];
        }

        $normalize = fn($value) => preg_replace(
            '/[^a-z]/',
            '',
            strtolower(trim((string) $value))
        );

        $firstName = $normalize($patient->first_name ?? '');
        $lastName = $normalize($patient->last_name ?? '');
        $reportText = $normalize($ocrText);

        if ($firstName === '' || $lastName === '' || $reportText === '') {
            return [
                'matched' => null,
                'reason' => 'Patient identity could not be confirmed from the report text',
            ];
        }

        $nameOk = str_contains($reportText, $firstName)
            && str_contains($reportText, $lastName);

        return [
            'matched' => $nameOk,
            'reason' => $nameOk
                ? null
                : 'The selected patient name could not be confirmed in the report text',
        ];
    }

    /**
     * NEW — Resolve the user who should be notified about results for
     * this order.
     *
     * Prefers lab_orders.ordered_by. Falls back to
     * lab_order_items.created_by. Returns null if neither is available.
     */
    private function resolveNotifiableUser(int $labOrderId): ?User
    {
        $orderedBy = DB::table('lab_orders')
            ->where('id', $labOrderId)
            ->value('ordered_by');

        if ($orderedBy) {
            $user = User::find($orderedBy);

            if ($user) {
                return $user;
            }
        }

        $createdBy = DB::table('lab_order_items')
            ->where('lab_order_id', $labOrderId)
            ->whereNotNull('created_by')
            ->value('created_by');

        return $createdBy ? User::find($createdBy) : null;
    }

    /**
     * NEW — Send a "results are ready" notification to the ordering
     * doctor (or fallback creator) for each processed file.
     *
     * - Skips files already notified (results_notified_at guard).
     * - Isolated in try/catch so a notification failure does not fail
     *   the upload response.
     */
    private function notifyOrdererOfResults(int $labOrderId, array $files): void
    {
        if (empty($files)) {
            return;
        }

        try {
            $notifiable = $this->resolveNotifiableUser($labOrderId);

            if (!$notifiable) {
                Log::warning('Lab results ready, but no notifiable user resolved', [
                    'lab_order_id' => $labOrderId,
                ]);

                return;
            }

            // Load order + patient once so the notification can render
            // the patient name without extra queries per file.
            $order = LabOrder::with('patient')->find($labOrderId);

            if (!$order) {
                return;
            }

            foreach ($files as $file) {
                /** @var LabResultFile $file */
                if (!empty($file->results_notified_at)) {
                    continue;
                }

                $notifiable->notify(
                    new LabResultsReadyNotification(
                        order: $order,
                        file: $file,
                        itemCount: $file->resultItems->count(),
                    )
                );

                $file->forceFill(['results_notified_at' => now()])->save();
            }
        } catch (Throwable $e) {
            Log::error('Failed to notify orderer of lab results', [
                'lab_order_id' => $labOrderId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
