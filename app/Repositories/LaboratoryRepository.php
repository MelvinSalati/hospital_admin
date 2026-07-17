<?php
// app/Repositories/LaboratoryRepository.php

namespace App\Repositories;

use Illuminate\Support\Facades\DB;

class LaboratoryRepository extends BaseRepository
{
    protected function setTable(): void
    {
        $this->table = 'lab_tests';
    }

    /**
     * Get lab tests list with filters
     */
    public function getLabTestsList(array $filters = [], $perPage = 15)
    {
        $query = DB::table('lab_tests')
            ->whereNull('deleted_at');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('test_code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        $orderBy = $filters['order_by'] ?? 'name';
        $orderDir = $filters['order_dir'] ?? 'asc';
        $query->orderBy($orderBy, $orderDir);

        return $this->paginateResults($query, $perPage);
    }

    /**
     * Get lab panels list
     */
    public function getLabPanelsList(array $filters = [], $perPage = 15)
    {
        $query = DB::table('lab_panels')
            ->whereNull('deleted_at');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('panel_code', 'like', "%{$search}%");
            });
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        $panels = $query->orderBy('name')
            ->paginate($perPage);

        // Load panel items
        $formattedPanels = collect($panels->items())->map(function ($panel) {
            $items = DB::table('lab_panel_items as lpi')
                ->join('lab_tests as lt', 'lpi.lab_test_id', '=', 'lt.id')
                ->where('lpi.lab_panel_id', $panel->id)
                ->select('lt.*', 'lpi.id as panel_item_id')
                ->get();

            return [
                'id' => $panel->id,
                'panel_code' => $panel->panel_code,
                'name' => $panel->name,
                'description' => $panel->description,
                'price' => $panel->price,
                'is_active' => $panel->is_active,
                'tests' => $items,
                'tests_count' => $items->count(),
                'created_at' => $panel->created_at
            ];
        });

        return [
            'data' => $formattedPanels,
            'pagination' => [
                'total' => $panels->total(),
                'per_page' => $panels->perPage(),
                'current_page' => $panels->currentPage(),
                'last_page' => $panels->lastPage()
            ]
        ];
    }

    /**
     * Get lab orders list
     */
    public function getLabOrdersList(array $filters = [], $perPage = 15)
    {
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
        if (!empty($filters['patient_id'])) {
            $query->where('lo.patient_id', $filters['patient_id']);
        }

        if (!empty($filters['doctor_id'])) {
            $query->where('lo.doctor_id', $filters['doctor_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('lo.status', $filters['status']);
        }

        if (!empty($filters['priority'])) {
            $query->where('lo.priority', $filters['priority']);
        }

        if (!empty($filters['from_date'])) {
            $query->whereDate('lo.order_date', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->whereDate('lo.order_date', '<=', $filters['to_date']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('lo.order_number', 'like', "%{$search}%")
                    ->orWhere('p.first_name', 'like', "%{$search}%")
                    ->orWhere('p.last_name', 'like', "%{$search}%")
                    ->orWhere('p.patient_number', 'like', "%{$search}%");
            });
        }

        $orderBy = $filters['order_by'] ?? 'lo.order_date';
        $orderDir = $filters['order_dir'] ?? 'desc';
        $query->orderBy($orderBy, $orderDir);

        $orders = $query->paginate($perPage);

        // Format data
        $formattedOrders = collect($orders->items())->map(function ($order) {
            $items = $this->getLabOrderItems($order->id);
            $results = $this->getLabResults($order->id);

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
                'consultation_number' => $order->consultation_number,
                'items' => $items,
                'results' => $results,
                'items_count' => $items->count(),
                'results_count' => $results->count(),
                'created_at' => $order->created_at
            ];
        });

        return [
            'data' => $formattedOrders,
            'pagination' => [
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage()
            ]
        ];
    }

    /**
     * Get lab order details
     */
    public function getLabOrderDetails($id)
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

        $items = $this->getLabOrderItems($id);
        $results = $this->getLabResults($id);
        $specimens = $this->getLabSpecimens($id);

        return [
            'order' => $order,
            'items' => $items,
            'results' => $results,
            'specimens' => $specimens
        ];
    }

    /**
     * Create lab order
     */
    public function createLabOrder(array $data, array $testIds)
    {
        try {
            $this->beginTransaction();

            // Create order
            $orderId = DB::table('lab_orders')->insertGetId([
                'order_number' => $this->generateOrderNumber('LAB'),
                'patient_id' => $data['patient_id'],
                'doctor_id' => $data['doctor_id'],
                'consultation_id' => $data['consultation_id'] ?? null,
                'order_date' => now(),
                'priority' => $data['priority'] ?? 'routine',
                'clinical_notes' => $data['clinical_notes'] ?? null,
                'is_emergency' => $data['is_emergency'] ?? false,
                'emergency_notes' => $data['emergency_notes'] ?? null,
                'status' => 'ordered',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Add test items
            foreach ($testIds as $testId) {
                DB::table('lab_order_items')->insert([
                    'lab_order_id' => $orderId,
                    'lab_test_id' => $testId,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            $this->commit();

            return $this->getLabOrderDetails($orderId);
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Add lab results
     */
    public function addLabResults($orderId, array $results)
    {
        try {
            $this->beginTransaction();

            foreach ($results as $result) {
                // Add result
                DB::table('lab_results')->insert([
                    'lab_order_id' => $orderId,
                    'lab_test_id' => $result['test_id'],
                    'result_value' => $result['result_value'],
                    'reference_range' => $result['reference_range'] ?? null,
                    'flag' => $result['flag'] ?? null,
                    'comments' => $result['comments'] ?? null,
                    'attachment_path' => $result['attachment_path'] ?? null,
                    'technician_id' => auth()->id(),
                    'result_date' => now(),
                    'status' => 'completed',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Update order item status
                DB::table('lab_order_items')
                    ->where('lab_order_id', $orderId)
                    ->where('lab_test_id', $result['test_id'])
                    ->update([
                        'status' => 'completed',
                        'updated_at' => now()
                    ]);
            }

            // Check if all items completed
            $pendingCount = DB::table('lab_order_items')
                ->where('lab_order_id', $orderId)
                ->where('status', '!=', 'completed')
                ->count();

            if ($pendingCount == 0) {
                DB::table('lab_orders')
                    ->where('id', $orderId)
                    ->update([
                        'status' => 'completed',
                        'updated_at' => now()
                    ]);
            }

            $this->commit();

            return $this->getLabOrderDetails($orderId);
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Add specimen information
     */
    public function addSpecimen($orderId, array $data)
    {
        return DB::table('lab_specimens')->insert([
            'lab_order_id' => $orderId,
            'specimen_type' => $data['specimen_type'],
            'collection_date' => $data['collection_date'] ?? now(),
            'collected_by' => auth()->id(),
            'received_by' => $data['received_by'] ?? null,
            'received_date' => $data['received_date'] ?? null,
            'status' => 'collected',
            'notes' => $data['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Get lab statistics
     */
    public function getStatistics($period = 'today')
    {
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
            case 'year':
                $query->whereYear('created_at', now()->year);
                break;
        }

        $totalOrders = (clone $query)->count();
        $completedOrders = (clone $query)->where('status', 'completed')->count();
        $pendingOrders = (clone $query)->where('status', 'ordered')->count();

        // Revenue
        $revenue = DB::table('lab_order_items as loi')
            ->join('lab_tests as lt', 'loi.lab_test_id', '=', 'lt.id')
            ->join('lab_orders as lo', 'loi.lab_order_id', '=', 'lo.id')
            ->when($period === 'today', function ($q) {
                return $q->whereDate('lo.created_at', today());
            })
            ->when($period === 'week', function ($q) {
                return $q->whereBetween('lo.created_at', [now()->startOfWeek(), now()->endOfWeek()]);
            })
            ->when($period === 'month', function ($q) {
                return $q->whereMonth('lo.created_at', now()->month);
            })
            ->sum('lt.price');

        // Top tests
        $topTests = DB::table('lab_order_items as loi')
            ->join('lab_tests as lt', 'loi.lab_test_id', '=', 'lt.id')
            ->join('lab_orders as lo', 'loi.lab_order_id', '=', 'lo.id')
            ->when($period === 'today', function ($q) {
                return $q->whereDate('lo.created_at', today());
            })
            ->when($period === 'week', function ($q) {
                return $q->whereBetween('lo.created_at', [now()->startOfWeek(), now()->endOfWeek()]);
            })
            ->when($period === 'month', function ($q) {
                return $q->whereMonth('lo.created_at', now()->month);
            })
            ->select(
                'lt.id',
                'lt.name',
                'lt.category',
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(lt.price) as revenue')
            )
            ->groupBy('lt.id', 'lt.name', 'lt.category')
            ->orderBy('order_count', 'desc')
            ->limit(10)
            ->get();

        return [
            'orders' => [
                'total' => $totalOrders,
                'completed' => $completedOrders,
                'pending' => $pendingOrders,
                'completion_rate' => $totalOrders > 0 ? round(($completedOrders / $totalOrders) * 100, 2) : 0
            ],
            'revenue' => $revenue,
            'top_tests' => $topTests
        ];
    }

    /**
     * Get lab order items
     */
    private function getLabOrderItems($orderId)
    {
        return DB::table('lab_order_items as loi')
            ->join('lab_tests as lt', 'loi.lab_test_id', '=', 'lt.id')
            ->where('loi.lab_order_id', $orderId)
            ->select(
                'loi.*',
                'lt.name as test_name',
                'lt.test_code',
                'lt.category',
                'lt.unit',
                'lt.reference_range',
                'lt.price'
            )
            ->get();
    }

    /**
     * Get lab results
     */
    private function getLabResults($orderId)
    {
        return DB::table('lab_results as lr')
            ->join('lab_tests as lt', 'lr.lab_test_id', '=', 'lt.id')
            ->where('lr.lab_order_id', $orderId)
            ->select(
                'lr.*',
                'lt.name as test_name',
                'lt.unit',
                'lt.reference_range'
            )
            ->orderBy('lr.result_date')
            ->get();
    }

    /**
     * Get lab specimens
     */
    private function getLabSpecimens($orderId)
    {
        return DB::table('lab_specimens')
            ->where('lab_order_id', $orderId)
            ->orderBy('collection_date')
            ->get();
    }

    /**
     * Generate order number
     */
    private function generateOrderNumber($prefix): string
    {
        $year = date('Y');
        $month = date('m');

        $lastOrder = DB::table('lab_orders')
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastOrder) {
            $lastNumber = intval(substr($lastOrder->order_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . $year . $month . $newNumber;
    }

    /**
     * Get status badge
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

    /**
     * Paginate results
     */
    private function paginateResults($query, $perPage)
    {
        $page = request()->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $total = $query->count();

        $data = $query->offset($offset)
            ->limit($perPage)
            ->get();

        return [
            'data' => $data,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => (int)$page,
                'last_page' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total)
            ]
        ];
    }
}
