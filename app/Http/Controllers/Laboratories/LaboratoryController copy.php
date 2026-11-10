<?php

namespace App\Http\Controllers\Laboratories;

use App\Http\Controllers\Controller;
use App\Models\Laboratories\Laboratory as LabOrder;
use App\Services\Laboratories\LaboratoryService;
use App\Services\Laboratories\ResultOcrService;
use App\Services\Laboratories\LabReportParser;
use App\Services\QueueService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Models\Laboratory\TestConfig;
use App\Models\Laboratory\TestCategory;
use Inertia\Inertia;

class LaboratoryController extends Controller
{
    protected $labsService;
    protected $queueService;

    public function __construct(LaboratoryService $labsService, QueueService $queueService)
    {
        $this->labsService  = $labsService;
        $this->queueService = $queueService;
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
        return Inertia::render('laboratories/processed');
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
        // Get all test configurations with their parameters
        $tests = TestConfig::with('parameters')->get();

        // Get all categories
        $categories = TestCategory::all();

        return Inertia::render('laboratories/settings', [
            'tests' => $tests,
            'categories' => $categories,
        ]);
    }

    public function index()
    {
        $laboratoryItems = LabOrder::join('lab_order_items', 'lab_orders.id', '=', 'lab_order_items.lab_order_id')
            ->join('patients', 'patients.id', '=', 'lab_orders.patient_id')
            ->limit(4)
            ->get();

        return Inertia::render('laboratories/laboratory', [
            'queue' => $laboratoryItems->map(function ($items) use ($laboratoryItems) {
                $gender = ucFirst($items->gender);

                $tests = $laboratoryItems
                    ->where('lab_order_id', $items->lab_order_id)
                    ->map(fn($item) => [
                        'test_name'   => $item->test_name,
                        'unit_price'  => $item->unit_price,
                        'quantity'    => $item->quantity,
                        'total_price' => $item->total_price,
                        'status'      => $item->status,
                        'amount'      => (float) $item->total_price, // per-test amount
                    ])
                    ->values();

                return [
                    'id'           => $items->patient_id,
                    'first_name'   => $items->first_name,
                    'last_name'    => $items->last_name,
                    'gender'       => $gender[0] . '/' . \Carbon\Carbon::parse($items->date_of_birth)->age,
                    'tests'        => $tests,
                    'token'        => $items->visit_token,
                    'lab_order_id' => $items->lab_order_id,
                    'total_amount' => $tests->sum('amount'), // per-order subtotal
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
            $results   = $request->input('results'); // This should be an array of results
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

            // Check if all tests in the order are completed
            $pendingTests = DB::table('lab_order_items')
                ->where('lab_order_id', $orderId)
                ->where('status', '!=', 'completed')
                ->count();

            if ($pendingTests === 0) {
                // Update main order status to completed
                DB::table('lab_orders')
                    ->where('id', $orderId)
                    ->update([
                        'status'     => 'completed',
                        'updated_at' => now()
                    ]);
            } else {
                // Update main order status to processing
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

    public function uploadResults(Request $request, int $userId, int $lab_order_id)
    {
        $request->validate([
            'pdfs'   => ['required'],           // file or array of files
            'pdfs.*' => ['file', 'mimes:pdf', 'max:10240'],
        ]);

        try {
            // $userId is the patient id (same key as lab_orders.patient_id)
            $order = LabOrder::where('id', $lab_order_id)
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lab order not found for this patient'
                ], 404);
            }

            // Normalize to an array of UploadedFile objects.
            // $request->file('pdfs') is an array when the field is submitted as
            // "pdfs[]" (multiple), and a single UploadedFile otherwise.
            $raw = $request->file('pdfs');
            $files = is_array($raw) ? $raw : [$raw];

            $files = array_values(array_filter($files, fn($f) => $f instanceof UploadedFile));

            if (empty($files)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid file uploaded'
                ], 422);
            }

            $ocr    = app(ResultOcrService::class);
            $parser = app(LabReportParser::class);

            $patient = DB::table('patients')->where('id', $userId)->first();

            $orderItems = DB::table('lab_order_items')
                ->where('lab_order_id', $lab_order_id)
                ->get(['test_id', 'test_name', 'status']);

            $allMatched   = [];
            $allUnmatched = [];
            $fileIds      = [];
            $reportNos    = [];
            $patientChecks = [];

            foreach ($files as $file) {
                $path = $file->store("lab-results/{$userId}/{$lab_order_id}", 'local'); // private disk

                // 1. Read the file (text layer for digital PDFs, OCR for scans/photos)
                $text   = $ocr->extractText(Storage::disk('local')->path($path), $file->getMimeType());
                $header = $parser->header($text);
                $parsed = $parser->items($text);

                // 2. Keep the original file against the order
                $fileId = DB::table('lab_result_files')->insertGetId([
                    'lab_order_id'  => $lab_order_id,
                    'uploaded_by'   => $userId,
                    'original_name' => $file->getClientOriginalName(),
                    'path'          => $path,
                    'mime_type'     => $file->getMimeType(),
                    'size'          => $file->getSize(),
                    'report_no'     => $header['report_no'],
                    'ocr_text'      => $text,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);

                // 3. Check the report belongs to this patient (catches wrong-patient uploads)
                $patientCheck = $this->checkPatientMatch($patient, $header);

                // 4. Match parsed rows to the tests ordered
                foreach ($parsed as $row) {
                    $item = $this->matchOrderItem($row['test_name'], $orderItems);

                    if (!$item) {
                        $row['source_file'] = $file->getClientOriginalName();
                        $allUnmatched[]     = $row;
                        continue;
                    }

                    $allMatched[] = [ // same shape enterResults() expects
                        'test_id'        => $item->test_id,
                        'test_name'      => $item->test_name,
                        'result_value'   => $row['value'],
                        'unit'           => $row['unit'],
                        'abnormal_flag'  => $row['flag'] === 'L' ? 'low' : ($row['flag'] === 'H' ? 'high' : 'normal'),
                        'interpretation' => null,
                        'notes'          => 'Ref: ' . ($row['ref_low'] !== null ? "{$row['ref_low']} - {$row['ref_high']}" : 'n/a')
                            . ' | Source: ' . $file->getClientOriginalName(),
                        'raw_line'       => $row['raw_line'],
                    ];
                }

                $fileIds[]      = $fileId;
                $reportNos[]    = $header['report_no'];
                $patientChecks[] = [
                    'file'   => $file->getClientOriginalName(),
                    'result' => $patientCheck,
                ];
            }

            return response()->json([
                'success'        => true,
                'message'        => 'File(s) processed. Review the values before saving.',
                'file_ids'       => $fileIds,
                'file_id'        => $fileIds[0] ?? null,
                'report_nos'     => $reportNos,
                'report_no'      => $reportNos[0] ?? null,
                'patient_checks' => $patientChecks,
                'patient_check'  => $patientChecks[0]['result'] ?? null, // backward compatible
                'results'        => $allMatched,   // POST these to enterResults after review
                'unmatched'      => $allUnmatched, // rows needing manual mapping
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error uploading lab results: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to process results file: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function matchOrderItem(string $name, $orderItems)
    {
        $norm   = fn($s) => preg_replace('/[^a-z0-9]/', '', strtolower($s));
        $needle = $norm($name);
        $best   = null;
        $bestScore = 0;

        foreach ($orderItems as $item) {
            $hay = $norm($item->test_name);
            if ($needle === $hay) {
                return $item;
            }

            similar_text($needle, $hay, $pct);
            if ($pct > $bestScore) {
                $bestScore = $pct;
                $best      = $item;
            }
        }
        return $bestScore >= 85 ? $best : null;
    }

    private function checkPatientMatch($patient, array $header): array
    {
        if (!$patient || empty($header['name'])) {
            return ['matched' => null, 'reason' => 'Name not found on report'];
        }

        $norm = fn($s) => preg_replace('/[^a-z]/', '', strtolower($s));
        $reportName = $norm($header['name']);
        $first      = $norm($patient->first_name);
        $last       = $norm($patient->last_name);

        $nameOk = str_contains($reportName, $first) && str_contains($reportName, $last);
        $ageOk  = empty($header['age']) || empty($patient->date_of_birth)
            || abs(\Carbon\Carbon::parse($patient->date_of_birth)->age - (int) $header['age']) <= 1;

        return [
            'matched'     => $nameOk && $ageOk,
            'report_name' => $header['name'],
            'report_age'  => $header['age'],
            'reason'      => $nameOk && $ageOk ? null : 'Name or age on the report does not match this patient',
        ];
    }
}
