<?php

namespace App\Http\Controllers\Maternalchildhealth;

use App\Http\Controllers\Controller;
use App\Models\BulkStores\StockLedger;
use App\Models\Services\Service;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MaternalchildhealthBulkStoreController extends Controller
{
    public function index(int $departmentId)
    {
        return Inertia::render('radiologies/bulkstore', [
            'services' => Service::all(),
            'orderedItems' => \App\Models\BulkStores\DepartmentRequisition::with([
                'department:id,name',
                'requestedBy:id,name',
                'items.product:id,product_name,product_code',
            ])->where('department_id', $departmentId)
                ->latest()
                ->get()
                ->map(function ($req) {
                    return [
                        'id'                 => $req->id,
                        'requisition_uuid'   => $req->requisition_uuid,
                        'requisition_number' => $req->requisition_number,
                        'status'             => $req->status,
                        'priority'           => $req->priority,
                        'requested_at'       => $req->requested_at?->toIso8601String(),
                        'required_by_date'   => $req->required_by_date?->format('Y-m-d'),
                        'estimated_total'    => (float) ($req->estimated_total ?? 0),
                        'items_count'        => $req->items->count(),
                        'department'         => $req->department?->name,
                        'requested_by'       => $req->requestedBy?->name,
                        'justification'      => $req->justification,

                        // ─── line items for the details modal ───
                        'items' => $req->items->map(function ($item) {
                            return [
                                'id'                    => $item->id,
                                'product_id'            => $item->product_id,
                                'product_name'          => $item->product?->product_name ?? 'Unknown',
                                'product_code'          => $item->product?->product_code,
                                'quantity_requested'    => $item->quantity_requested,
                                'quantity_approved'     => $item->quantity_approved,
                                'quantity_fulfilled'    => $item->quantity_fulfilled,
                                'unit'                  => $item->unit,
                                'estimated_unit_price'  => (float) ($item->estimated_unit_price ?? 0),
                                'estimated_total'       => (float) ($item->estimated_total ?? 0),
                                'batch_number'          => $item->batch_number,
                                'expiry_date'           => $item->expiry_date?->format('Y-m-d'),
                                'status'                => $item->status,
                                'notes'                 => $item->notes,
                            ];
                        })->values(),
                    ];
                }),
        ]);
    }
}
