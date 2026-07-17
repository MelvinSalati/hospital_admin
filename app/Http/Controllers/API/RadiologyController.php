<?php
// app/Http/Controllers/API/RadiologyController.php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RadiologyController extends Controller
{
    /**
     * Display a listing of radiology procedures
     */
    public function procedures(Request $request): JsonResponse
    {
        try {
            $query = DB::table('radiology_procedures')
                ->whereNull('deleted_at');

            // Apply filters
            if ($request->has('modality')) {
                $query->where('modality', $request->modality);
            }

            if ($request->has('body_part')) {
                $query->where('body_part', $request->body_part);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('procedure_code', 'like', "%{$search}%")
                      ->orWhere('modality', 'like', "%{$search}%");
                });
            }

            if ($request->has('active')) {
                $query->where('is_active', $request->active);
            }

            $perPage = $request->get('per_page', 15);
            $procedures = $query->orderBy('name')
                ->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $procedures->items(),
                'pagination' => [
                    'total' => $procedures->total(),
                    'per_page' => $procedures->perPage(),
                    'current_page' => $procedures->currentPage(),
                    'last_page' => $procedures->lastPage()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching procedures',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display a listing of radiology orders
     */
    public function orders(Request $request): JsonResponse
    {
        try {
            $query = DB::table('radiology_orders as ro')
                ->join('patients as p', 'ro.patient_id', '=', 'p.id')
                ->join('users as d', 'ro.doctor_id', '=', 'd.id')
                ->leftJoin('consultations as c', 'ro.consultation_id', '=', 'c.id')
                ->whereNull('ro.deleted_at')
                ->select(
                    'ro.*',
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
                $query->where('ro.patient_id', $request->patient_id);
            }

            if ($request->has('doctor_id')) {
                $query->where('ro.doctor_id', $request->doctor_id);
            }

            if ($request->has('status')) {
                $query->where('ro.status', $request->status);
            }

            if ($request->has('priority')) {
                $query->where('ro.priority', $request->priority);
            }

            if ($request->has('date_from')) {
                $query->whereDate('ro.order_date', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->whereDate('ro.order_date', '<=', $request->date_to);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('ro.order_number', 'like', "%{$search}%")
                      ->orWhere('p.first_name', 'like', "%{$search}%")
                      ->orWhere('p.last_name', 'like', "%{$search}%")
                      ->orWhere('p.patient_number', 'like', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 15);
            $orders = $query->orderBy('ro.order_date', 'desc')
                ->paginate($perPage);

            // Format data
            $formattedOrders = collect($orders->items())->map(function ($order) {
                $items = DB::table('radiology_order_items')
                    ->join('radiology_procedures', 'radiology_order_items.radiology_procedure_id', '=', 'radiology_procedures.id')
                    ->where('radiology_order_id', $order->id)
                    ->select('radiology_order_items.*', 'radiology_procedures.name', 'radiology_procedures.procedure_code', 'radiology_procedures.modality', 'radiology_procedures.body_part')
                    ->get();

                $results = DB::table('radiology_results')
                    ->where('radiology_order_id', $order->id)
                    ->get();

                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'order_date' => $order->order_date,
                    'priority' => $order->priority,
                    'status' => $order->status,
                    'status_badge' => $this->getStatusBadge($order->status),
                    'clinical_history' => $order->clinical_history,
                    'reason_for_exam' => $order->reason_for_exam,
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
                'message' => 'Error fetching radiology orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new radiology order
     */
    public function createOrder(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'patient_id' => 'required|integer|exists:patients,id',
                'doctor_id' => 'required|integer|exists:users,id',
                'consultation_id' => 'nullable|integer|exists:consultations,id',
                'procedure_ids' => 'required|array|min:1',
                'procedure_ids.*' => 'integer|exists:radiology_procedures,id',
                'priority' => 'nullable|in:routine,urgent,stat',
                'clinical_history' => 'nullable|string',
                'reason_for_exam' => 'nullable|string',
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
            $orderNumber = 'RAD' . date('Ymd') . str_pad(DB::table('radiology_orders')->count() + 1, 4, '0', STR_PAD_LEFT);

            // Calculate total cost
            $totalCost = DB::table('radiology_procedures')
                ->whereIn('id', $request->procedure_ids)
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

            // Create radiology order
            $orderId = DB::table('radiology_orders')->insertGetId([
                'order_number' => $orderNumber,
                'patient_id' => $request->patient_id,
                'doctor_id' => $request->doctor_id,
                'consultation_id' => $request->consultation_id,
                'order_date' => now(),
                'priority' => $request->priority ?? 'routine',
                'clinical_history' => $request->clinical_history,
                'reason_for_exam' => $request->reason_for_exam,
                'is_emergency' => $isEmergency,
                'emergency_notes' => $request->emergency_notes,
                'status' => 'ordered',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Add procedure items
            foreach ($request->procedure_ids as $procedureId) {
                DB::table('radiology_order_items')->insert([
                    'radiology_order_id' => $orderId,
                    'radiology_procedure_id' => $procedureId,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            // Create bill
            if (!$isEmergency) {
                $this->createRadiologyBill($request->patient_id, $orderId, $totalCost);
            }

            DB::commit();

            // Fetch created order
            $order = $this->getRadiologyOrderDetails($orderId);

            return response()->json([
                'success' => true,
                'message' => $isEmergency ? 'Emergency radiology order created' : 'Radiology order created successfully',
                'data' => $order
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error creating radiology order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get radiology order details
     */
    public function orderDetails($id): JsonResponse
    {
        try {
            $order = $this->getRadiologyOrderDetails($id);

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Radiology order not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $order
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching radiology order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add results to radiology order
     */
    public function addResults(Request $request, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'findings' => 'required|string',
                'impression' => 'nullable|string',
                'recommendations' => 'nullable|string',
                'images' => 'nullable|array',
                'images.*' => 'file|mimes:jpg,jpeg,png,dcm|max:10240',
                'radiologist_id' => 'required|integer|exists:users,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $order = DB::table('radiology_orders')->where('id', $id)->first();
            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Radiology order not found'
                ], 404);
            }

            // Handle image uploads
            $imagePaths = [];
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $path = $image->store('radiology-images/' . $id, 'public');
                    $imagePaths[] = $path;
                }
            }

            // Insert result
            DB::table('radiology_results')->insert([
                'radiology_order_id' => $id,
                'findings' => $request->findings,
                'impression' => $request->impression,
                'recommendations' => $request->recommendations,
                'images' => json_encode($imagePaths),
                'radiologist_id' => $request->radiologist_id,
                'report_date' => now(),
                'status' => 'completed',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Update order status
            DB::table('radiology_orders')
                ->where('id', $id)
                ->update([
                    'status' => 'completed',
                    'updated_at' => now()
                ]);

            // Update order items status
            DB::table('radiology_order_items')
                ->where('radiology_order_id', $id)
                ->update([
                    'status' => 'completed',
                    'updated_at' => now()
                ]);

            DB::commit();

            $updatedOrder = $this->getRadiologyOrderDetails($id);

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
     * Get radiology statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $period = $request->get('period', 'today');
            $query = DB::table('radiology_orders');

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
                'completed' => (clone $query)->where('status', 'completed')->count(),
                'by_modality' => DB::table('radiology_order_items')
                    ->join('radiology_procedures', 'radiology_order_items.radiology_procedure_id', '=', 'radiology_procedures.id')
                    ->join('radiology_orders', 'radiology_order_items.radiology_order_id', '=', 'radiology_orders.id')
                    ->when($period === 'today', function ($q) {
                        return $q->whereDate('radiology_orders.created_at', today());
                    })
                    ->when($period === 'week', function ($q) {
                        return $q->whereBetween('radiology_orders.created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                    })
                    ->when($period === 'month', function ($q) {
                        return $q->whereMonth('radiology_orders.created_at', now()->month);
                    })
                    ->select('radiology_procedures.modality', DB::raw('count(*) as count'))
                    ->groupBy('radiology_procedures.modality')
                    ->get(),
                'revenue' => DB::table('radiology_order_items')
                    ->join('radiology_orders', 'radiology_order_items.radiology_order_id', '=', 'radiology_orders.id')
                    ->join('radiology_procedures', 'radiology_order_items.radiology_procedure_id', '=', 'radiology_procedures.id')
                    ->when($period === 'today', function ($q) {
                        return $q->whereDate('radiology_orders.created_at', today());
                    })
                    ->when($period === 'week', function ($q) {
                        return $q->whereBetween('radiology_orders.created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                    })
                    ->when($period === 'month', function ($q) {
                        return $q->whereMonth('radiology_orders.created_at', now()->month);
                    })
                    ->sum('radiology_procedures.price')
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
     * Get procedures by modality
     */
    public function proceduresByModality(): JsonResponse
    {
        try {
            $procedures = DB::table('radiology_procedures')
                ->select('modality', DB::raw('count(*) as count'))
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->groupBy('modality')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $procedures
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching procedures by modality',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify radiology report
     */
    public function verifyReport($id): JsonResponse
    {
        try {
            $result = DB::table('radiology_results')->where('id', $id)->first();

            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Report not found'
                ], 404);
            }

            DB::table('radiology_results')
                ->where('id', $id)
                ->update([
                    'verified_by' => auth()->id(),
                    'verified_at' => now(),
                    'status' => 'verified',
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Report verified successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error verifying report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper: Get radiology order details
     */
    private function getRadiologyOrderDetails($id)
    {
        $order = DB::table('radiology_orders as ro')
            ->join('patients as p', 'ro.patient_id', '=', 'p.id')
            ->join('users as d', 'ro.doctor_id', '=', 'd.id')
            ->leftJoin('consultations as c', 'ro.consultation_id', '=', 'c.id')
            ->where('ro.id', $id)
            ->select(
                'ro.*',
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

        $items = DB::table('radiology_order_items as roi')
            ->join('radiology_procedures as rp', 'roi.radiology_procedure_id', '=', 'rp.id')
            ->where('roi.radiology_order_id', $id)
            ->select(
                'roi.*',
                'rp.name as procedure_name',
                'rp.procedure_code',
                'rp.modality',
                'rp.body_part',
                'rp.price'
            )
            ->get();

        $results = DB::table('radiology_results')
            ->where('radiology_order_id', $id)
            ->get();

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'order_date' => $order->order_date,
            'priority' => $order->priority,
            'status' => $order->status,
            'clinical_history' => $order->clinical_history,
            'reason_for_exam' => $order->reason_for_exam,
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
            'results' => $results->map(function ($result) {
                return [
                    'id' => $result->id,
                    'findings' => $result->findings,
                    'impression' => $result->impression,
                    'recommendations' => $result->recommendations,
                    'images' => json_decode($result->images ?? '[]', true),
                    'report_date' => $result->report_date,
                    'status' => $result->status,
                    'radiologist_id' => $result->radiologist_id
                ];
            }),
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
     * Helper: Create bill for radiology order
     */
    private function createRadiologyBill($patientId, $orderId, $amount)
    {
        $billNumber = 'BILL' . date('Ymd') . str_pad(DB::table('bills')->count() + 1, 4, '0', STR_PAD_LEFT);

        DB::table('bills')->insert([
            'bill_number' => $billNumber,
            'patient_id' => $patientId,
            'billable_type' => 'radiology_order',
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
            'scheduled' => ['label' => 'Scheduled', 'color' => 'purple'],
            'completed' => ['label' => 'Completed', 'color' => 'green'],
            'cancelled' => ['label' => 'Cancelled', 'color' => 'red'],
            'reported' => ['label' => 'Reported', 'color' => 'yellow']
        ];

        return $badges[$status] ?? ['label' => ucfirst($status), 'color' => 'gray'];
    }
}
