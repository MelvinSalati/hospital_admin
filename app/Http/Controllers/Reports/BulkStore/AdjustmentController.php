<?php

namespace App\Http\Controllers\Reports\BulkStore;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Bulkstores\ProductAdjustment;

class AdjustmentController extends Controller
{
    public function getAdjustmentReport(Request $request)
    {
        $beginAt = $request->from;
        $endAt   = $request->to;

        if ($beginAt && $endAt && $beginAt > $endAt) {
            return $this->response([
                'message' => 'Start date is greater than end date',
                'status'  => 422,
            ]);
        }

        $query = ProductAdjustment::with([
            'product',
            'creator',
            'approvedBy'
        ]);

        if ($beginAt) {
            $query->whereDate('created_at', '>=', $beginAt);
        }

        if ($endAt) {
            $query->whereDate('created_at', '<=', $endAt);
        }

        $adjustments = $query
            ->latest()
            ->get();

        $data = $adjustments->map(function ($adjustment) {
            return $this->mapReportFields($adjustment);
        });

        return $this->response([
            'message' => $data,
            'status'  => 200,
        ]);
    }

    protected function mapReportFields($adjustment)
    {
        return [
     
            'location' => 'BulkStore',
            'sku'               => $adjustment->product?->product_code,
            'product_name'      => $adjustment->product?->product_name,
            'quantity'          => $adjustment->adjustment_difference,
            'adjustment_type'   => $adjustment->adjustment_type,
            'reason'            => $adjustment->reason,
            'created_by'        => $adjustment->creator?->name,
            'approved_by'       => $adjustment->approvedBy?->name,
        ];
    }

    protected function response(array $message)
    {
        return response()->json($message);
    }
}
