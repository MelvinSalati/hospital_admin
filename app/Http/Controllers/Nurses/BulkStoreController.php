<?php

namespace App\Http\Controllers\Nurses;

use App\Http\Controllers\Controller;
use App\Models\BulkStores\StockLedger;
use App\Models\Nurses\DepartmentRequisitionItem;
use App\Models\Services\Service;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BulkStoreController extends Controller
{
    public function index()
    {
        return Inertia::render('nurses/bulkstore',[
            'services' => Service::all(),
        ]);
    }

    public function getProducts(){
        try {
             $products  =  StockLedger::with(['product'])->get()->map(function($item){
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product?->product_name ?? 'Unknown',
                    'unit' => $item->unit,
                    'quantity' => $item->closing_balance ?? 0,
                    'unit_price' => $item->unit_price,
                    'total_value' => $item->total_value,
                    'batch_number' => $item->batch_number,
                    'expiry_date' => $item->expiry_date ? $item->expiry_date->format('Y-m-d') : null,
                ];
             });

        }
        catch(\Exception $e){
            Log::info('Error fetching products: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Failed to fetch products',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'data' => $products
        ]);
    }

    public function orderStock(Request $request) {
    $orderDetails  =  [
        'uuid'         => Str::uuid(),
        'department_id'=> $request->input('department',6),
        'product_id' => $request->productId,
        'quantity_requested' => $request->quantity,
        'unit' => $request->unit,
        'estimated_unit_price' => $request->estimatedUnitPrice,
        'estimated_total' => $request->estimatedTotal,
        'actual_unit_price' => $request->actualUnitPrice,
        'actual_total' => $request->actualTotal,
        'batch_number' => $request->bacthNumber,
        'expiry_date' => $request->expiryDate,
        'notes' =>   $request->notes
    ];

    $order =  DepartmentRequisitionItem::create($orderDetails);

    }
}
