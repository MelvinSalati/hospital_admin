<?php

namespace App\Http\Controllers\Laboratories;

use App\Http\Controllers\Controller;
use App\Models\Laboratory\TestConfig;
use App\Models\Laboratory\TestParameter;
use App\Models\Laboratory\TestCategory;
use App\Models\Laboratory\TestOrder;
use App\Models\Laboratory\TestResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class LaboratorySettingsController extends Controller
{
    /**
     * Display the laboratory settings page
     */
    public function index()
    {
        $tests = TestConfig::with('parameters')->get();
        $categories = TestCategory::all();

        return Inertia::render('laboratory/settings', [
            'tests' => $tests,
            'categories' => $categories,
        ]);
    }

    // ─── Test Configurations ─────────────────────────────────────────────

    public function getTests(Request $request)
    {
        $query = TestConfig::with('parameters');

        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('is_active', $request->status === 'active');
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('test_name', 'LIKE', "%{$search}%")
                    ->orWhere('test_code', 'LIKE', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('test_name')->get());
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
    public function storeTest(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'test_name' => 'required|string|max:255',
            'test_code' => 'required|string|unique:test_configs|max:100',
            'category' => 'required|string|max:100',
            'sample_type' => 'required|string|max:100',
            'unit' => 'nullable|string|max:50',
            'reference_range' => 'nullable|string|max:100',
            'cash_price' => 'nullable|numeric|min:0',
            'insurance_price' => 'nullable|numeric|min:0',
            'turnaround_time' => 'nullable|string|max:50',
            'is_active' => 'boolean',
            'parameters' => 'nullable|array',
            'parameters.*.parameter_name' => 'required|string|max:255',
            'parameters.*.data_type' => 'required|in:text,number,select,textarea,date,time,checkbox,file',
            'parameters.*.unit' => 'nullable|string|max:50',
            'parameters.*.reference_range' => 'nullable|string|max:100',
            'parameters.*.options' => 'nullable|array',
            'parameters.*.is_required' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            $test = TestConfig::create([
                'test_name' => $request->test_name,
                'test_code' => $request->test_code,
                'category' => $request->category,
                'sample_type' => $request->sample_type,
                'unit' => $request->unit,
                'reference_range' => $request->reference_range,
                'cash_price' => $request->cash_price ?? 0,
                'insurance_price' => $request->insurance_price ?? 0,
                'turnaround_time' => $request->turnaround_time,
                'is_active' => $request->is_active ?? true,
            ]);

            if ($request->has('parameters')) {
                foreach ($request->parameters as $param) {
                    $test->parameters()->create($param);
                }
            }

            DB::commit();
            return response()->json(['success' => true, 'data' => $test->load('parameters')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create test: ' . $e->getMessage()], 500);
        }
    }

    public function getTest($id)
    {
        $test = TestConfig::with('parameters')->findOrFail($id);
        return response()->json($test);
    }

    public function updateTest(Request $request, $id)
    {
        $test = TestConfig::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'test_name' => 'required|string|max:255',
            'test_code' => 'required|string|max:100|unique:test_configs,test_code,' . $id,
            'category' => 'required|string|max:100',
            'sample_type' => 'required|string|max:100',
            'unit' => 'nullable|string|max:50',
            'reference_range' => 'nullable|string|max:100',
            'cash_price' => 'nullable|numeric|min:0',
            'insurance_price' => 'nullable|numeric|min:0',
            'turnaround_time' => 'nullable|string|max:50',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $test->update([
            'test_name' => $request->test_name,
            'test_code' => $request->test_code,
            'category' => $request->category,
            'sample_type' => $request->sample_type,
            'unit' => $request->unit,
            'reference_range' => $request->reference_range,
            'cash_price' => $request->cash_price ?? 0,
            'insurance_price' => $request->insurance_price ?? 0,
            'turnaround_time' => $request->turnaround_time,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json(['success' => true, 'data' => $test->load('parameters')]);
    }

    public function deleteTest($id)
    {
        $test = TestConfig::findOrFail($id);
        $test->delete();
        return response()->json(['success' => true]);
    }

    public function toggleTestStatus($id)
    {
        $test = TestConfig::findOrFail($id);
        $test->is_active = !$test->is_active;
        $test->save();
        return response()->json(['success' => true, 'is_active' => $test->is_active]);
    }

    // ─── Test Parameters ─────────────────────────────────────────────────

    public function getParameters($testId)
    {
        $parameters = TestParameter::where('test_config_id', $testId)
            ->orderBy('display_order')
            ->get();
        return response()->json($parameters);
    }

    public function storeParameter(Request $request, $testId)
    {
        $validator = Validator::make($request->all(), [
            'parameter_name' => 'required|string|max:255',
            'data_type' => 'required|in:text,number,select,textarea,date,time,checkbox,file',
            'unit' => 'nullable|string|max:50',
            'reference_range' => 'nullable|string|max:100',
            'options' => 'nullable|array',
            'is_required' => 'boolean',
            'display_order' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->all();
        $data['test_config_id'] = $testId;

        $parameter = TestParameter::create($data);
        return response()->json(['success' => true, 'data' => $parameter]);
    }

    public function updateParameter(Request $request, $id)
    {
        $parameter = TestParameter::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'parameter_name' => 'required|string|max:255',
            'data_type' => 'required|in:text,number,select,textarea,date,time,checkbox,file',
            'unit' => 'nullable|string|max:50',
            'reference_range' => 'nullable|string|max:100',
            'options' => 'nullable|array',
            'is_required' => 'boolean',
            'display_order' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $parameter->update($request->all());
        return response()->json(['success' => true, 'data' => $parameter]);
    }

    public function deleteParameter($id)
    {
        $parameter = TestParameter::findOrFail($id);
        $parameter->delete();
        return response()->json(['success' => true]);
    }

    public function toggleParameterStatus($id)
    {
        $parameter = TestParameter::findOrFail($id);
        $parameter->is_active = !$parameter->is_active;
        $parameter->save();
        return response()->json(['success' => true, 'is_active' => $parameter->is_active]);
    }

    // ─── Test Categories ─────────────────────────────────────────────────

    public function getCategories(Request $request)
    {
        $query = TestCategory::query();

        if ($request->has('active')) {
            $query->where('is_active', $request->active);
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function storeCategory(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:test_categories|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $category = TestCategory::create($request->all());
        return response()->json(['success' => true, 'data' => $category]);
    }

    public function getCategory($id)
    {
        $category = TestCategory::findOrFail($id);
        return response()->json($category);
    }

    public function updateCategory(Request $request, $id)
    {
        $category = TestCategory::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:test_categories,name,' . $id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $category->update($request->all());
        return response()->json(['success' => true, 'data' => $category]);
    }

    public function deleteCategory($id)
    {
        $category = TestCategory::findOrFail($id);
        $category->delete();
        return response()->json(['success' => true]);
    }

    public function toggleCategoryStatus($id)
    {
        $category = TestCategory::findOrFail($id);
        $category->is_active = !$category->is_active;
        $category->save();
        return response()->json(['success' => true, 'is_active' => $category->is_active]);
    }

    // ─── Test Results ────────────────────────────────────────────────────

    public function getResults($orderId)
    {
        $results = TestResult::where('test_order_id', $orderId)
            ->with(['parameter', 'testConfig'])
            ->get();
        return response()->json($results);
    }

    public function storeResults(Request $request, $orderId)
    {
        $validator = Validator::make($request->all(), [
            'results' => 'required|array',
            'results.*.parameter_id' => 'required|exists:test_parameters,id',
            'results.*.value' => 'required|string',
            'results.*.remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            foreach ($request->results as $result) {
                TestResult::updateOrCreate(
                    [
                        'test_order_id' => $orderId,
                        'parameter_id' => $result['parameter_id'],
                    ],
                    [
                        'value' => $result['value'],
                        'remarks' => $result['remarks'] ?? null,
                        'entered_by' => auth()->id(),
                        'entered_at' => now(),
                        'status' => 'entered',
                    ]
                );
            }

            // Update order status
            $order = TestOrder::find($orderId);
            if ($order) {
                $order->status = 'in_progress';
                $order->save();
            }

            DB::commit();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to save results: ' . $e->getMessage()], 500);
        }
    }

    public function verifyResult($id)
    {
        $result = TestResult::findOrFail($id);
        $result->status = 'verified';
        $result->verified_by = auth()->id();
        $result->verified_at = now();
        $result->save();
        return response()->json(['success' => true]);
    }

    public function rejectResult($id)
    {
        $result = TestResult::findOrFail($id);
        $result->status = 'rejected';
        $result->save();
        return response()->json(['success' => true]);
    }

    // ─── Test Orders ─────────────────────────────────────────────────────

    public function getOrders(Request $request)
    {
        $query = TestOrder::with(['patient', 'testConfig']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function storeOrder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:users,id',
            'test_config_id' => 'required|exists:test_configs,id',
            'priority' => 'required|in:routine,urgent,emergency',
            'sample_type' => 'required|string|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $order = TestOrder::create([
            'order_number' => 'LAB-' . date('Ymd') . '-' . str_pad(TestOrder::count() + 1, 4, '0', STR_PAD_LEFT),
            'patient_id' => $request->patient_id,
            'test_config_id' => $request->test_config_id,
            'priority' => $request->priority,
            'sample_type' => $request->sample_type,
            'notes' => $request->notes,
            'status' => 'pending',
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'data' => $order->load(['patient', 'testConfig'])]);
    }

    public function getOrder($id)
    {
        $order = TestOrder::with(['patient', 'testConfig', 'results'])->findOrFail($id);
        return response()->json($order);
    }

    public function updateOrderStatus(Request $request, $id)
    {
        $order = TestOrder::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,collected,in_progress,completed,cancelled,rejected',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $order->status = $request->status;
        $order->save();
        return response()->json(['success' => true]);
    }

    public function collectSample(Request $request, $id)
    {
        $order = TestOrder::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'sample_condition' => 'required|string|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $order->status = 'collected';
        $order->collected_by = auth()->id();
        $order->collected_at = now();
        $order->sample_condition = $request->sample_condition;
        $order->notes = $request->notes;
        $order->save();

        return response()->json(['success' => true]);
    }

    public function enterResults(Request $request, $id)
    {
        $order = TestOrder::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'results' => 'required|array',
            'results.*.parameter_id' => 'required|exists:test_parameters,id',
            'results.*.value' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            foreach ($request->results as $result) {
                TestResult::updateOrCreate(
                    [
                        'test_order_id' => $id,
                        'parameter_id' => $result['parameter_id'],
                    ],
                    [
                        'value' => $result['value'],
                        'remarks' => $result['remarks'] ?? null,
                        'entered_by' => auth()->id(),
                        'entered_at' => now(),
                        'status' => 'entered',
                    ]
                );
            }

            $order->status = 'in_progress';
            $order->save();

            DB::commit();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to enter results: ' . $e->getMessage()], 500);
        }
    }
}
