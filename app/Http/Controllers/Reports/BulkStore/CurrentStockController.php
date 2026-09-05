<?php

namespace App\Http\Controllers\Reports\BulkStore;

use App\Http\Controllers\Controller;
use App\Models\BulkStores\StockLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurrentStockController extends Controller
{
    public function getCurrentStock(Request $request)
    {
        $beginAt = $request->from;
        $endAt = $request->to;

        // Validate date range
        if ($beginAt && $endAt && $beginAt > $endAt) {
            return response()->json([
                'status' => 422,
                'message' => 'Start date is greater than end date'
            ], 422);
        }

        // Use join to get product data directly
        $query = StockLedger::leftJoin('products', 'stock_ledgers.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('departments', 'stock_ledgers.department_id', '=', 'departments.id')
            ->select(
                'stock_ledgers.*',
                'products.name as product_name',
                'products.code as product_code',
                'products.sku as product_sku',
                'categories.name as category_name',
                'departments.name as department_name'
            )
            ->whereNull('stock_ledgers.deleted_at')
            ->where('stock_ledgers.is_verified', 1);

        // Filter by date range
        if ($beginAt) {
            $query->whereDate('stock_ledgers.ledger_date', '>=', $beginAt);
        }

        if ($endAt) {
            $query->whereDate('stock_ledgers.ledger_date', '<=', $endAt);
        }

        $stock = $query->get();

        // Get latest record per product within the date range
        $latestStock = $stock->groupBy('product_id')
            ->map(function ($items) {
                return $items->sortByDesc(function ($item) {
                    return $item->ledger_date . ' ' . $item->created_at;
                })->first();
            })
            ->values()
            ->map(function ($item) {
                $unitCost = (float) ($item->avg_unit_cost ?? 0);
                $qtyOnHand = (int) $item->closing_balance;

                return [
                    'Date' => $item->ledger_date ? date('Y-m-d', strtotime($item->ledger_date)) : '',
                    'SKU' => $item->product_sku ?? $item->product_code ?? 'N/A',
                    'Product Name' => $item->product_name ?? 'Unknown Product',
                    'Category' => $item->category_name ?? 'Uncategorized',
                    'Location' => $item->department_name ?? 'Bulk Store',
                    'Qty on Hand' => $qtyOnHand,
                    'Unit Cost' => number_format($unitCost, 2),
                    'Total Value' => number_format($qtyOnHand * $unitCost, 2),
                ];
            });

        return response()->json([
            'status' => 200,
            'message' => $latestStock
        ]);
    }
}
