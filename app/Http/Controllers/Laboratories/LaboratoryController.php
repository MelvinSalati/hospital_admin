<?php

namespace App\Http\Controllers\Laboratories;

use App\Http\Controllers\Controller;
use App\Services\Laboratories\LaboratoryService;
use App\Services\QueueService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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

    public function dashboard(){
        return Inertia::render('laboratories/dashboard',[

        ]);
    }

    public function  reports(){
        return Inertia::render('laboratories/logistics');
    }

    public function  processed()
    {
        return Inertia::render('laboratories/processed');
    }

    public function  logistics()
    {
        return Inertia::render('laboratories/logistics');
    }

    public function  orders()
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

    public function index(){
       return  Inertia::render('laboratories/laboratory',[
            "queue"  => $this->queueService->getQueue(3),
        ]);
    }
    public function getlaboratoryTests(){
       return $this->labsService->getAllLaboratoryTests();
    }
    public function enterResults(Request $request, $orderId)
    {
        try {
            $results = $request->input('results'); // This should be an array of results
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
                    'order_id' => $orderId,
                    'test_id' => $result['test_id'],
                    'patient_id' => $patientId,
                    'result_value' => $result['result_value'],
                    'unit' => $result['unit'] ?? null,
                    'abnormal_flag' => $result['abnormal_flag'] ?? 'normal',
                    'interpretation' => $result['interpretation'] ?? null,
                    'notes' => $result['notes'] ?? null,
                    'performed_by' => auth()->id(),
                    'performed_date' => now(),
                    'status' => 'completed',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if ($inserted) {
                    $insertedResults[] = $result['test_id'];
                    DB::table('lab_order_items')
                        ->where('lab_order_id', $orderId)
                        ->where('test_id', $result['test_id'])
                        ->update([
                            'status' => 'completed',
                            'result_entered_date' => now(),
                            'updated_at' => now()
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
                        'status' => 'completed',
                        'updated_at' => now()
                    ]);
            } else {
                // Update main order status to processing
                DB::table('lab_orders')
                    ->where('id', $orderId)
                    ->update([
                        'status' => 'processing',
                        'updated_at' => now()
                    ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Results saved successfully',
                'data' => $insertedResults
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error saving lab results: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to save results: ' . $e->getMessage()
            ], 500);
        }
    }
}
