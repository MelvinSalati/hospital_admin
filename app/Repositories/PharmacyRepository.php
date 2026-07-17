<?php
// app/Repositories/PharmacyRepository.php

namespace App\Repositories;

use Illuminate\Support\Facades\DB;
use App\Models\Product as Pharmacy;
class PharmacyRepository 
{
    protected $pharmacy;
    
    public function __construct(Pharmacy $pharmacyModel)
    {
        $this->pharmacy = $pharmacyModel;
    }

    /**
     * Get drugs list with filters
     */
    public function getDrugsList()
    {
        return $this->pharmacy->all();
    }

    /**
     * Get drug details with stocks
     */
    public function getDrugDetails($id)
    {
        $drug = DB::table('drugs')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$drug) {
            return null;
        }

        $supplier = null;
        if ($drug->supplier_id) {
            $supplier = DB::table('suppliers')->find($drug->supplier_id);
        }

        $stocks = $this->getDrugStocks($id);
        $movements = $this->getStockMovements($id);

        return [
            'drug' => $drug,
            'supplier' => $supplier,
            'stocks' => $stocks,
            'movements' => $movements
        ];
    }

    /**
     * Create new drug
     */
    public function createDrug(array $data)
    {
        $data['drug_code'] = $this->generateDrugCode();
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('drugs')->insertGetId($data);

        return $this->find($id);
    }

    /**
     * Update drug
     */
    public function updateDrug($id, array $data)
    {
        $data['updated_at'] = now();

        DB::table('drugs')
            ->where('id', $id)
            ->update($data);

        return $this->find($id);
    }

    /**
     * Delete drug (soft delete)
     */
    public function deleteDrug($id)
    {
        return DB::table('drugs')
            ->where('id', $id)
            ->update([
                'deleted_at' => now()
            ]);
    }

    /**
     * Get drug stocks
     */
    public function getDrugStocks($drugId)
    {
        return DB::table('drug_stocks')
            ->where('drug_id', $drugId)
            ->orderBy('expiry_date')
            ->get();
    }

    /**
     * Get stock movements
     */
    public function getStockMovements($drugId = null, $filters = [])
    {
        $query = DB::table('stock_movements as sm')
            ->join('drugs as d', 'sm.drug_id', '=', 'd.id')
            ->leftJoin('drug_stocks as ds', 'sm.drug_stock_id', '=', 'ds.id')
            ->leftJoin('users as u', 'sm.created_by', '=', 'u.id')
            ->select(
                'sm.*',
                'd.name as drug_name',
                'd.drug_code',
                'ds.batch_number',
                'ds.expiry_date',
                'u.first_name as created_by_first_name',
                'u.last_name as created_by_last_name'
            );

        if ($drugId) {
            $query->where('sm.drug_id', $drugId);
        }

        if (!empty($filters['type'])) {
            $query->where('sm.type', $filters['type']);
        }

        if (!empty($filters['from_date'])) {
            $query->whereDate('sm.created_at', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->whereDate('sm.created_at', '<=', $filters['to_date']);
        }

        return $query->orderBy('sm.created_at', 'desc')
            ->get();
    }

    /**
     * Get low stock drugs
     */
    public function getLowStockDrugs()
    {
        return DB::table('drugs')
            ->where('is_active', true)
            ->get()
            ->filter(function ($drug) {
                $totalStock = DB::table('drug_stocks')
                    ->where('drug_id', $drug->id)
                    ->where('status', 'in_stock')
                    ->sum('quantity_available');

                return $totalStock <= $drug->reorder_level;
            })
            ->map(function ($drug) {
                $totalStock = DB::table('drug_stocks')
                    ->where('drug_id', $drug->id)
                    ->where('status', 'in_stock')
                    ->sum('quantity_available');

                return (object)[
                    'id' => $drug->id,
                    'name' => $drug->name,
                    'generic_name' => $drug->generic_name,
                    'current_stock' => $totalStock,
                    'reorder_level' => $drug->reorder_level,
                    'unit' => $drug->unit,
                    'status' => $totalStock <= 0 ? 'out_of_stock' : 'low_stock'
                ];
            })
            ->values();
    }

    /**
     * Get expiring drugs
     */
    public function getExpiringDrugs($days = 30)
    {
        return DB::table('drug_stocks as ds')
            ->join('drugs as d', 'ds.drug_id', '=', 'd.id')
            ->where('ds.expiry_date', '<=', now()->addDays($days))
            ->where('ds.expiry_date', '>', now())
            ->where('ds.quantity_available', '>', 0)
            ->where('ds.status', 'in_stock')
            ->select(
                'ds.*',
                'd.name as drug_name',
                'd.generic_name',
                'd.unit'
            )
            ->orderBy('ds.expiry_date')
            ->get();
    }

    /**
     * Get expired drugs
     */
    public function getExpiredDrugs()
    {
        return DB::table('drug_stocks as ds')
            ->join('drugs as d', 'ds.drug_id', '=', 'd.id')
            ->where('ds.expiry_date', '<=', now())
            ->where('ds.quantity_available', '>', 0)
            ->select(
                'ds.*',
                'd.name as drug_name',
                'd.generic_name',
                'd.unit',
                DB::raw('ds.quantity_available * ds.purchase_price as loss_value')
            )
            ->orderBy('ds.expiry_date')
            ->get();
    }

    /**
     * Process dispensation
     */
    public function createDispensation(array $data, array $items)
    {
        try {
            $this->beginTransaction();

            // Create dispensation
            $dispensationId = DB::table('dispensations')->insertGetId([
                'dispensation_number' => $this->generateDispensationNumber(),
                'patient_id' => $data['patient_id'],
                'prescription_id' => $data['prescription_id'] ?? null,
                'bill_id' => $data['bill_id'] ?? null,
                'status' => $data['status'] ?? 'dispensed',
                'dispensed_by' => auth()->id(),
                'dispensed_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Add dispensation items and update stock
            foreach ($items as $item) {
                DB::table('dispensation_items')->insert([
                    'dispensation_id' => $dispensationId,
                    'drug_id' => $item['drug_id'],
                    'drug_stock_id' => $item['stock_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total' => $item['total'],
                    'dosage' => $item['dosage'] ?? null,
                    'instructions' => $item['instructions'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Update stock
                DB::table('drug_stocks')
                    ->where('id', $item['stock_id'])
                    ->decrement('quantity_available', $item['quantity']);

                // Record stock movement
                DB::table('stock_movements')->insert([
                    'reference_number' => $this->generateMovementNumber(),
                    'drug_id' => $item['drug_id'],
                    'drug_stock_id' => $item['stock_id'],
                    'type' => 'dispense',
                    'quantity' => $item['quantity'],
                    'quantity_before' => $item['stock_before'],
                    'quantity_after' => $item['stock_before'] - $item['quantity'],
                    'unit_cost' => $item['purchase_price'] ?? null,
                    'reference_type' => 'dispensation',
                    'reference_id' => $dispensationId,
                    'created_by' => auth()->id(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            $this->commit();

            return $this->getDispensationDetails($dispensationId);
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Get dispensation details
     */
    public function getDispensationDetails($id)
    {
        $dispensation = DB::table('dispensations as d')
            ->join('patients as p', 'd.patient_id', '=', 'p.id')
            ->leftJoin('users as u', 'd.dispensed_by', '=', 'u.id')
            ->leftJoin('prescriptions as pr', 'd.prescription_id', '=', 'pr.id')
            ->where('d.id', $id)
            ->select(
                'd.*',
                'p.id as patient_id',
                'p.patient_number',
                'p.first_name as patient_first_name',
                'p.last_name as patient_last_name',
                'u.first_name as pharmacist_first_name',
                'u.last_name as pharmacist_last_name',
                'pr.prescription_number'
            )
            ->first();

        if (!$dispensation) {
            return null;
        }

        $items = DB::table('dispensation_items as di')
            ->join('drugs as dr', 'di.drug_id', '=', 'dr.id')
            ->join('drug_stocks as ds', 'di.drug_stock_id', '=', 'ds.id')
            ->where('di.dispensation_id', $id)
            ->select(
                'di.*',
                'dr.name as drug_name',
                'dr.generic_name',
                'dr.unit',
                'ds.batch_number',
                'ds.expiry_date'
            )
            ->get();

        return [
            'dispensation' => $dispensation,
            'items' => $items
        ];
    }

    /**
     * Get dispensations list
     */
    public function getDispensationsList(array $filters = [], $perPage = 15)
    {
        $query = DB::table('dispensations as d')
            ->join('patients as p', 'd.patient_id', '=', 'p.id')
            ->leftJoin('users as u', 'd.dispensed_by', '=', 'u.id')
            ->select(
                'd.*',
                'p.id as patient_id',
                'p.patient_number',
                'p.first_name as patient_first_name',
                'p.last_name as patient_last_name',
                'u.first_name as pharmacist_first_name',
                'u.last_name as pharmacist_last_name'
            );

        if (!empty($filters['patient_id'])) {
            $query->where('d.patient_id', $filters['patient_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('d.status', $filters['status']);
        }

        if (!empty($filters['from_date'])) {
            $query->whereDate('d.dispensed_at', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->whereDate('d.dispensed_at', '<=', $filters['to_date']);
        }

        $orderBy = $filters['order_by'] ?? 'd.dispensed_at';
        $orderDir = $filters['order_dir'] ?? 'desc';
        $query->orderBy($orderBy, $orderDir);

        return $this->paginateResults($query, $perPage);
    }

    /**
     * Get pharmacy statistics
     */
    public function getStatistics($period = 'today')
    {
        $query = DB::table('dispensations');

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

        $totalDispensations = (clone $query)->count();
        $totalRevenue = (clone $query)->sum('total_amount') ?? 0;

        // Top drugs
        $topDrugs = DB::table('dispensation_items as di')
            ->join('drugs as d', 'di.drug_id', '=', 'd.id')
            ->join('dispensations as dis', 'di.dispensation_id', '=', 'dis.id')
            ->when($period === 'today', function ($q) {
                return $q->whereDate('dis.created_at', today());
            })
            ->when($period === 'week', function ($q) {
                return $q->whereBetween('dis.created_at', [now()->startOfWeek(), now()->endOfWeek()]);
            })
            ->when($period === 'month', function ($q) {
                return $q->whereMonth('dis.created_at', now()->month);
            })
            ->select(
                'd.id',
                'd.name',
                DB::raw('SUM(di.quantity) as total_quantity'),
                DB::raw('SUM(di.total) as total_revenue')
            )
            ->groupBy('d.id', 'd.name')
            ->orderBy('total_quantity', 'desc')
            ->limit(10)
            ->get();

        // Stock summary
        $stockSummary = [
            'total_drugs' => DB::table('drugs')->where('is_active', true)->count(),
            'total_stock_value' => DB::table('drug_stocks')
                ->where('status', 'in_stock')
                ->sum(DB::raw('quantity_available * purchase_price')),
            'low_stock_count' => $this->getLowStockDrugs()->count(),
            'expiring_count' => $this->getExpiringDrugs()->count(),
            'expired_count' => $this->getExpiredDrugs()->count()
        ];

        return [
            'dispensations' => [
                'total' => $totalDispensations,
                'revenue' => $totalRevenue
            ],
            'top_drugs' => $topDrugs,
            'stock_summary' => $stockSummary
        ];
    }

    /**
     * Generate drug code
     */
    private function generateDrugCode(): string
    {
        $prefix = 'DRG';
        $year = date('Y');

        $lastDrug = DB::table('drugs')
            ->whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastDrug) {
            $lastNumber = intval(substr($lastDrug->drug_code, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . $year . $newNumber;
    }

    /**
     * Generate dispensation number
     */
    private function generateDispensationNumber(): string
    {
        $prefix = 'DISP';
        $year = date('Y');
        $month = date('m');

        $lastDisp = DB::table('dispensations')
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastDisp) {
            $lastNumber = intval(substr($lastDisp->dispensation_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . $year . $month . $newNumber;
    }

    /**
     * Generate movement number
     */
    private function generateMovementNumber(): string
    {
        return 'MOV' . date('YmdHis') . rand(100, 999);
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

    /**
     * Get stock status
     */
    private function getStockStatus($current, $reorderLevel): array
    {
        if ($current <= 0) {
            return ['label' => 'Out of Stock', 'color' => 'red'];
        } elseif ($current <= $reorderLevel) {
            return ['label' => 'Low Stock', 'color' => 'yellow'];
        } else {
            return ['label' => 'In Stock', 'color' => 'green'];
        }
    }
}
