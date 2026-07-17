<?php
// app/Http/Controllers/API/LabController.php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class LabController extends Controller
{
    /**
     * Display a listing of lab tests
     */
    public function tests(Request $request): JsonResponse
    {
        try {
            $query = DB::table('lab_tests')
                ->whereNull('deleted_at');

            // Apply filters
            if ($request->has('category')) {
                $query->where('category', $request->category);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('test_code', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            }

            if ($request->has('active')) {
                $query->where('is_active', $request->active);
            }

            $perPage = $request->get('per_page', 15);
            $tests = $query->orderBy('name')
                ->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $tests->items(),
                'pagination' => [
                    'total' => $tests->total(),
                    'per_page' => $tests->perPage(),
                    'current_page' => $tests->currentPage(),
                    'last_page' => $tests->lastPage()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching lab tests',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display a listing of lab orders
     */
    public function orders(Request $request): JsonResponse
    {
        try {
            $query = DB::table('lab_orders as lo')
                ->join('patients as p', 'lo.patient_id', '=', 'p.id')
                ->join('users as d', 'lo.doctor_id', '=', 'd.id')
                ->leftJoin('consultations as c', 'lo.consultation_id', '=', 'c.id')
                ->whereNull('lo.deleted_at')
                ->select(
                    'lo.*',
                    'p.id as patient_id',
                    'p.patient_number',
                    'p.first_name as patient_first_name',
                    'p.last_name as patient_last_name',
                    'd.id as doctor_id',
                    'd.first_name as doctor_first_name',
                    'd.last_name as doctor_last_name',
                    'c.consultation_number'
                );

            // Apply filters
            if ($request->has('patient_id')) {
                $query->where('lo.patient_id', $request->patient_id);
            }

            if ($request->has('doctor_id')) {
                $query->where('lo.doctor_id', $request->doctor_id);
            }

            if ($request->has('status')) {
                $query->where('lo.status', $request->status);
            }

            if ($request->has('priority')) {
                $query->where('lo.priority', $request->priority);
            }

            if ($request->has('date_from')) {
                $query->whereDate('lo.order_date', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->whereDate('lo.order_date', '<=', $request->date_to);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('lo.order_number', 'like', "%{$search}%")
                        ->orWhere('p.first_name', 'like', "%{$search}%")
                        ->orWhere('p.last_name', 'like', "%{$search}%")
                        ->orWhere('p.patient_number', 'like', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 15);
            $orders = $query->orderBy('lo.order_date', 'desc')
                ->paginate($perPage);

            // Format data
            $formattedOrders = collect($orders->items())->map(function ($order) {
                $items = DB::table('lab_order_items')
                    ->join('lab_tests', 'lab_order_items.lab_test_id', '=', 'lab_tests.id')
                    ->where('lab_order_id', $order->id)
                    ->select('lab_order_items.*', 'lab_tests.name', 'lab_tests.test_code', 'lab_tests.unit', 'lab_tests.reference_range')
                    ->get();

                $results = DB::table('lab_results')
                    ->where('lab_order_id', $order->id)
                    ->get();

                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'order_date' => $order->order_date,
                    'priority' => $order->priority,
                    'status' => $order->status,
                    'status_badge' => $this->getStatusBadge($order->status),
                    'clinical_notes' => $order->clinical_notes,
                    'patient' => [
                        'id' => $order->patient_id,
                        'patient_number' => $order->patient_number,
                        'name' => trim($order->patient_first_name . ' ' . $order->patient_last_name)
                    ],
                    'doctor' => [
                        'id' => $order->doctor_id,
                        'name' => trim($order->doctor_first_name . ' ' . $order->doctor_last_name)
                    ],
                    'items' => $items,
                    'results' => $results,
                    'items_count' => $items->count(),
                    'results_count' => $results->count(),
                    'created_at' => $order->created_at
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedOrders,
                'pagination' => [
                    'total' => $orders->total(),
                    'per_page' => $orders->perPage(),
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching lab orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new lab order
     */
    public function createOrder(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'patient_id' => 'required|integer|exists:patients,id',
                'doctor_id' => 'required|integer|exists:users,id',
                'consultation_id' => 'nullable|integer|exists:consultations,id',
                'test_ids' => 'required|array|min:1',
                'test_ids.*' => 'integer|exists:lab_tests,id',
                'priority' => 'nullable|in:routine,urgent,stat',
                'clinical_notes' => 'nullable|string',
                'is_emergency' => 'nullable|boolean',
                'emergency_notes' => 'nullable|string|required_if:is_emergency,true'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Generate order number
            $orderNumber = 'LAB' . date('Ymd') . str_pad(DB::table('lab_orders')->count() + 1, 4, '0', STR_PAD_LEFT);

            // Calculate total cost
            $totalCost = DB::table('lab_tests')
                ->whereIn('id', $request->test_ids)
                ->sum('price');

            // Check payment for non-emergency
            $isEmergency = $request->boolean('is_emergency', false);

            if (!$isEmergency) {
                // Check if patient has sufficient balance
                $patientBalance = $this->checkPatientBalance($request->patient_id, $totalCost);

                if (!$patientBalance['sufficient']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient balance',
                        'required_amount' => $patientBalance['required'],
                        'available_balance' => $patientBalance['available']
                    ], 402);
                }
            }

            // Create lab order
            $orderId = DB::table('lab_orders')->insertGetId([
                'order_number' => $orderNumber,
                'patient_id' => $request->patient_id,
                'doctor_id' => $request->doctor_id,
                'consultation_id' => $request->consultation_id,
                'order_date' => now(),
                'priority' => $request->priority ?? 'routine',
                'clinical_notes' => $request->clinical_notes,
                'is_emergency' => $isEmergency,
                'emergency_notes' => $request->emergency_notes,
                'status' => 'ordered',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Add test items
            foreach ($request->test_ids as $testId) {
                DB::table('lab_order_items')->insert([
                    'lab_order_id' => $orderId,
                    'lab_test_id' => $testId,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            // Create bill
            if (!$isEmergency) {
                $this->createLabBill($request->patient_id, $orderId, $totalCost);
            }

            DB::commit();

            // Fetch created order
            $order = $this->getLabOrderDetails($orderId);

            return response()->json([
                'success' => true,
                'message' => $isEmergency ? 'Emergency lab order created' : 'Lab order created successfully',
                'data' => $order
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error creating lab order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get lab order details
     */
    public function orderDetails($id): JsonResponse
    {
        try {
            $order = $this->getLabOrderDetails($id);

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lab order not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching lab order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add results to lab order
     */
    public function addResults(Request $request, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'results' => 'required|array|min:1',
                'results.*.test_id' => 'required|integer|exists:lab_order_items,id',
                'results.*.result_value' => 'required|string',
                'results.*.comments' => 'nullable|string',
                'results.*.attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $order = DB::table('lab_orders')->where('id', $id)->first();
            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lab order not found'
                ], 404);
            }

            foreach ($request->results as $result) {
                $attachmentPath = null;

                // Handle file upload if present
                if (isset($result['attachment']) && $result['attachment'] instanceof \Illuminate\Http\UploadedFile) {
                    $attachmentPath = $result['attachment']->store('lab-results/' . $id, 'public');
                }

                // Insert result
                DB::table('lab_results')->insert([
                    'lab_order_id' => $id,
                    'lab_order_item_id' => $result['test_id'],
                    'result_value' => $result['result_value'],
                    'comments' => $result['comments'] ?? null,
                    'attachment_path' => $attachmentPath,
                    'technician_id' => auth()->id(),
                    'result_date' => now(),
                    'status' => 'completed',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Update order item status
                DB::table('lab_order_items')
                    ->where('id', $result['test_id'])
                    ->update([
                        'status' => 'completed',
                        'updated_at' => now()
                    ]);
            }

            // Check if all items are completed
            $pendingItems = DB::table('lab_order_items')
                ->where('lab_order_id', $id)
                ->where('status', '!=', 'completed')
                ->count();

            if ($pendingItems == 0) {
                DB::table('lab_orders')
                    ->where('id', $id)
                    ->update([
                        'status' => 'completed',
                        'updated_at' => now()
                    ]);
            }

            DB::commit();

            $updatedOrder = $this->getLabOrderDetails($id);

            return response()->json([
                'success' => true,
                'message' => 'Results added successfully',
                'data' => $updatedOrder
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error adding results',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get lab statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $period = $request->get('period', 'today');
            $query = DB::table('lab_orders');

            switch ($period) {
                case 'today':
                    $query->whereDate('created_at', today());
                    break;
                case 'week':
                    $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                    break;
                case 'month':
                    $query->whereMonth('created_at', now()->month);
                    break;
            }

            $stats = [
                'total_orders' => (clone $query)->count(),
                'pending_orders' => (clone $query)->where('status', 'ordered')->count(),
                'in_progress' => (clone $query)->where('status', 'in_progress')->count(),
                'completed' => (clone $query)->where('status', 'completed')->count(),
                'by_priority' => (clone $query)
                    ->select('priority', DB::raw('count(*) as count'))
                    ->groupBy('priority')
                    ->get(),
                'by_status' => (clone $query)
                    ->select('status', DB::raw('count(*) as count'))
                    ->groupBy('status')
                    ->get(),
                'revenue' => DB::table('lab_order_items')
                    ->join('lab_orders', 'lab_order_items.lab_order_id', '=', 'lab_orders.id')
                    ->join('lab_tests', 'lab_order_items.lab_test_id', '=', 'lab_tests.id')
                    ->when($period === 'today', function ($q) {
                        return $q->whereDate('lab_orders.created_at', today());
                    })
                    ->when($period === 'week', function ($q) {
                        return $q->whereBetween('lab_orders.created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                    })
                    ->when($period === 'month', function ($q) {
                        return $q->whereMonth('lab_orders.created_at', now()->month);
                    })
                    ->sum('lab_tests.price')
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get lab tests by category
     */
    public function testsByCategory(): JsonResponse
    {
        try {
            $tests = DB::table('lab_tests')
                ->select('category', DB::raw('count(*) as count'))
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->groupBy('category')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $tests
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching test categories',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify lab results
     */
    public function verifyResult($id): JsonResponse
    {
        try {
            $result = DB::table('lab_results')->where('id', $id)->first();

            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Result not found'
                ], 404);
            }

            DB::table('lab_results')
                ->where('id', $id)
                ->update([
                    'verified_by' => auth()->id(),
                    'verified_at' => now(),
                    'status' => 'verified',
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Result verified successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error verifying result',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper: Get lab order details
     */
    private function getLabOrderDetails($id)
    {
        $order = DB::table('lab_orders as lo')
            ->join('patients as p', 'lo.patient_id', '=', 'p.id')
            ->join('users as d', 'lo.doctor_id', '=', 'd.id')
            ->leftJoin('consultations as c', 'lo.consultation_id', '=', 'c.id')
            ->where('lo.id', $id)
            ->select(
                'lo.*',
                'p.id as patient_id',
                'p.patient_number',
                'p.first_name as patient_first_name',
                'p.last_name as patient_last_name',
                'p.date_of_birth as patient_dob',
                'p.gender as patient_gender',
                'd.id as doctor_id',
                'd.first_name as doctor_first_name',
                'd.last_name as doctor_last_name',
                'c.consultation_number'
            )
            ->first();

        if (!$order) {
            return null;
        }

        $items = DB::table('lab_order_items as loi')
            ->join('lab_tests as lt', 'loi.lab_test_id', '=', 'lt.id')
            ->where('loi.lab_order_id', $id)
            ->select(
                'loi.*',
                'lt.name as test_name',
                'lt.test_code',
                'lt.unit',
                'lt.reference_range',
                'lt.price'
            )
            ->get();

        $results = DB::table('lab_results as lr')
            ->join('lab_order_items as loi', 'lr.lab_order_item_id', '=', 'loi.id')
            ->join('lab_tests as lt', 'loi.lab_test_id', '=', 'lt.id')
            ->where('lr.lab_order_id', $id)
            ->select(
                'lr.*',
                'lt.name as test_name',
                'lt.unit',
                'lt.reference_range'
            )
            ->get();

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'order_date' => $order->order_date,
            'priority' => $order->priority,
            'status' => $order->status,
            'clinical_notes' => $order->clinical_notes,
            'is_emergency' => $order->is_emergency,
            'emergency_notes' => $order->emergency_notes,
            'patient' => [
                'id' => $order->patient_id,
                'patient_number' => $order->patient_number,
                'name' => trim($order->patient_first_name . ' ' . $order->patient_last_name),
                'age' => $order->patient_dob ? now()->diffInYears($order->patient_dob) : null,
                'gender' => $order->patient_gender
            ],
            'doctor' => [
                'id' => $order->doctor_id,
                'name' => trim($order->doctor_first_name . ' ' . $order->doctor_last_name)
            ],
            'consultation_number' => $order->consultation_number,
            'items' => $items,
            'results' => $results,
            'created_at' => $order->created_at
        ];
    }

    /**
     * Helper: Check patient balance
     */
    private function checkPatientBalance($patientId, $requiredAmount)
    {
        $bill = DB::table('bills')
            ->where('patient_id', $patientId)
            ->whereIn('payment_status', ['pending', 'partial'])
            ->latest()
            ->first();

        if (!$bill) {
            return [
                'sufficient' => false,
                'required' => $requiredAmount,
                'available' => 0
            ];
        }

        $available = $bill->paid_amount - $bill->total_amount;

        return [
            'sufficient' => $available >= $requiredAmount,
            'required' => $requiredAmount,
            'available' => $available
        ];
    }

    /**
     * Helper: Create bill for lab order
     */
    private function createLabBill($patientId, $orderId, $amount)
    {
        $billNumber = 'BILL' . date('Ymd') . str_pad(DB::table('bills')->count() + 1, 4, '0', STR_PAD_LEFT);

        DB::table('bills')->insert([
            'bill_number' => $billNumber,
            'patient_id' => $patientId,
            'billable_type' => 'lab_order',
            'billable_id' => $orderId,
            'bill_date' => today(),
            'subtotal' => $amount,
            'total_amount' => $amount,
            'paid_amount' => 0,
            'due_amount' => $amount,
            'payment_status' => 'pending',
            'created_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Helper: Get status badge
     */
    private function getStatusBadge($status): array
    {
        $badges = [
            'ordered' => ['label' => 'Ordered', 'color' => 'blue'],
            'in_progress' => ['label' => 'In Progress', 'color' => 'yellow'],
            'completed' => ['label' => 'Completed', 'color' => 'green'],
            'cancelled' => ['label' => 'Cancelled', 'color' => 'red'],
            'verified' => ['label' => 'Verified', 'color' => 'purple']
        ];

        return $badges[$status] ?? ['label' => ucfirst($status), 'color' => 'gray'];
    }
}
