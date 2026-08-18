<?php

namespace App\Dashboards\BulkStores;

use Carbon\Carbon;
use App\Models\BulkStores\Product;
use App\Models\BulkStores\PurchaseRequisition;

class Metrics
{
    private $beginAt;
    private $endAt;

    /**
     * Create a new class instance.
     */
    public function __construct($period = null)
    {
        if ($period && isset($period['begin']) && isset($period['end'])) {
            $this->beginAt = $period['begin'];
            $this->endAt = $period['end'];
        }
    }

    /**
     * Get dashboard metrics
     * 
     * @return array
     */
    public function dashboardMetrics()
    {
        if (empty($this->beginAt) || empty($this->endAt)) {
            return $this->monthMetrics();
        }

        return $this->getPeriodMetrics($this->beginAt, $this->endAt);
    }

    /**
     * Get monthly metrics
     * 
     * @return array
     */
    private function monthMetrics()
    {
        $now = Carbon::now();
        $this->beginAt = $now->startOfMonth()->format('Y-m-d H:i:s');
        $this->endAt = $now->copy()->endOfMonth()->format('Y-m-d H:i:s');

        // Get totals for the month
        $totalProducts = Product::count();

        // $stockValue = PurchaseRequisition::with(['requisitionItem', 'ledger', 'product'])
        //     ->whereBetween('created_at', [$this->beginAt, $this->endAt])
        //     ->where('status', 'received')
        //     ->sum('estimated_total');

        // Get additional metrics for the dashboard
        // $receivedToday = PurchaseRequisition::whereDate('created_at', Carbon::today())
        //     ->where('status', 'received')
        //     ->sum('estimated_total');

        // $lowStock = Product::where('quantity', '<=', 10)->count(); 
        // Adjust threshold as needed

        // $nearExpiry = Product::whereBetween('expiry_date', [
        //     Carbon::now()->format('Y-m-d'),
        //     Carbon::now()->addDays(30)->format('Y-m-d')
        // ])->count();

        return [
            'period' => 'This Month',
            'total_products' => $totalProducts,
            'stock_value' => PurchaseRequisition::with('item.products')->where('status','approved')
            ->sum('estimated_total'),
            // 'stock_value_raw' => $stockValue,
            // 'low_stock' => $lowStock,
            // 'near_expiry' => $nearExpiry,
            // 'received_today' => $receivedToday,
            // 'begin_at' => $this->beginAt,
            // 'end_at' => $this->endAt,
            // 'metrics' => [
            //     'consumption' => $this->getMonthlyConsumption(),
            //     'received' => $this->getMonthlyReceived(),
            //     'adjustments' => $this->getMonthlyAdjustments(),
            //     'returns' => $this->getMonthlyReturns(),
            // ],
            // 'top_products' => $this->getTopConsumedProducts(),
            // 'department_consumption' => $this->getDepartmentConsumption(),
            // 'pending_actions' => $this->getPendingActions(),
            // 'recent_transactions' => $this->getRecentTransactions(),
        ];
    }

    /**
     * Get period metrics
     * 
     * @param string $beginAt
     * @param string $endAt
     * @return array
     */
    private function getPeriodMetrics($beginAt, $endAt)
    {
        // Similar to monthMetrics but with custom date range
        $totalProducts = Product::count();

        $stockValue = PurchaseRequisition::with(['requisitionItem', 'ledger', 'product'])
            ->whereBetween('created_at', [$beginAt, $endAt])
            ->where('status', 'received')
            ->sum('estimated_total');

        return [
            'period' => 'Custom Period',
            'total_products' => $totalProducts,
            'stock_value' => number_format($stockValue, 2),
            'stock_value_raw' => $stockValue,
            'begin_at' => $beginAt,
            'end_at' => $endAt,
        ];
    }

    /**
     * Get monthly consumption
     * 
     * @return float
     */
    private function getMonthlyConsumption()
    {
        return PurchaseRequisition::whereBetween('created_at', [$this->beginAt, $this->endAt])
            ->where('status', 'issued')
            ->sum('estimated_total');
    }

    /**
     * Get monthly received
     * 
     * @return float
     */
    private function getMonthlyReceived()
    {
        return PurchaseRequisition::whereBetween('created_at', [$this->beginAt, $this->endAt])
            ->where('status', 'received')
            ->sum('estimated_total');
    }

    /**
     * Get monthly adjustments
     * 
     * @return float
     */
    private function getMonthlyAdjustments()
    {
        // Adjust based on your actual adjustment model/logic
        return 2450; // Placeholder
    }

    /**
     * Get monthly returns
     * 
     * @return float
     */
    private function getMonthlyReturns()
    {
        // Adjust based on your actual returns model/logic
        return 1200; // Placeholder
    }

    /**
     * Get top consumed products
     * 
     * @return array
     */
    private function getTopConsumedProducts()
    {
        // Implement based on your actual data structure
        return [
            ['name' => 'Paracetamol 500mg', 'quantity' => 25000],
            ['name' => 'ART Drugs', 'quantity' => 18400],
            ['name' => 'Antibiotics', 'quantity' => 12500],
        ];
    }

    /**
     * Get department consumption
     * 
     * @return array
     */
    private function getDepartmentConsumption()
    {
        // Implement based on your actual data structure
        return [
            'Pharmacy' => 36000,
            'OPD' => 28000,
            'Laboratory' => 18000,
            'Maternity' => 9000,
            'Surgical' => 7000,
        ];
    }

    /**
     * Get pending actions
     * 
     * @return array
     */
    private function getPendingActions()
    {
        return [
            'approve_requests' => 14,
            'receive_orders' => 5,
            'stock_adjustments' => 8,
            'expiry_review' => 3,
        ];
    }

    /**
     * Get recent transactions
     * 
     * @return array
     */
    private function getRecentTransactions()
    {
        // Implement based on your actual transaction model
        return [
            [
                'date' => 'Today',
                'product' => 'Ceftriaxone 1g',
                'action' => 'Received',
                'quantity' => 500,
                'status' => 'completed'
            ],
            [
                'date' => 'Today',
                'product' => 'Surgical Gloves',
                'action' => 'Issued',
                'quantity' => 200,
                'status' => 'completed'
            ],
        ];
    }

    /**
     * Calculate percentage change
     * 
     * @param float $current
     * @param float $previous
     * @return string
     */
    private function calculatePercentageChange($current, $previous)
    {
        if ($previous == 0) {
            return '0%';
        }

        $change = (($current - $previous) / $previous) * 100;
        return number_format($change, 1) . '%';
    }
}
