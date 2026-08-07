<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStores\StorePurchaseOrderRequest;
use App\Models\BulkStores\PurchaseOrder;
use App\Models\BulkStores\PurchaseRequisition;
use App\Services\Purchases\PurchaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
class PurchaseOrderController extends Controller
{
    protected $purchaseRequisitionService;

 public function __construct(

        PurchaseService $purchaseRequisitionService
    ) {

        $this->purchaseRequistionService = $purchaseRequisitionService;
    }

    // GET /purchase-orders
    public function index(Request $request): JsonResponse
    {
          $results = $this->purchaseRequistionService->getRequisitions();
        return response()->json([
            'data' => $results
        ]);
        // Inertia::render('bulksores/purchaseorder',[
        //     'pending'  =>  \App\Models\Bulkstores\PurchaseRequisition::all()
        // ]);
    } 

    public function approvedPurchaseRequesition(Request $request): JsonResponse
    {
        $results = PurchaseRequisition::with(['items.product', 'supplier'])
            ->where('status', 'approved')
            ->get();
        return response()->json([
            'data' => $results
        ]);
    }   

    // POST /purchase-orders
    public function store(StorePurchaseOrderRequest $request): JsonResponse
    {
        $order = DB::transaction(function () use ($request) {
            $data  = $request->validated();
            $items = $data['items'] ?? [];
            unset($data['items']);

            $order = PurchaseOrder::create($data);
            $order->items()->createMany($items);
            $order->recalculateTotal();

            return $order->load(['items.product', 'supplier']);
        });

        return response()->json($order, 201);
    }

    // GET /purchase-orders/{purchaseOrder}
    public function show(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $purchaseOrder->load(['items.product', 'supplier', 'bulkStore', 'createdBy', 'approvedBy']);

        return response()->json($purchaseOrder);
    }

    // POST /purchase-orders/{purchaseOrder}/approve
    public function approve(PurchaseOrder $purchaseOrder): JsonResponse
    {
        if ($purchaseOrder->status !== 'pending') {
            return response()->json(['message' => 'Only pending orders can be approved.'], 422);
        }

        $purchaseOrder->update([
            'status'      => 'approved',
            'approved_by' => auth()->id(),
        ]);

        return response()->json(['message' => 'Purchase order approved.', 'order' => $purchaseOrder]);
    }

    // POST /purchase-orders/{purchaseOrder}/receive
    // Triggers actual stock receive for every line item on the PO
    public function receive(PurchaseOrder $purchaseOrder): JsonResponse
    {
        if (! in_array($purchaseOrder->status, ['approved', 'partially_received'])) {
            return response()->json(['message' => 'Order is not approved for receiving.'], 422);
        }

        DB::transaction(function () use ($purchaseOrder) {
            foreach ($purchaseOrder->items as $item) {
                $pending = $item->pendingQuantity();
                if ($pending <= 0) {
                    continue;
                }

                $this->stockService->receive([
                    'bulk_store_id'    => $purchaseOrder->bulk_store_id,
                    'product_id'       => $item->product_id,
                    'supplier_id'      => $purchaseOrder->supplier_id,
                    'quantity'         => $pending,
                    'batch_number'     => $item->batch_number,
                    'expiry_date'      => $item->expiry_date,
                    'unit_cost'        => $item->unit_price,
                    'reference_number' => $purchaseOrder->po_number,
                ]);

                $item->update(['received_quantity' => $item->ordered_quantity]);
            }

            $purchaseOrder->update([
                'status'        => 'received',
                'received_date' => now(),
            ]);
        });

        return response()->json(['message' => 'Purchase order received and stock updated.']);
    }

    // DELETE /purchase-orders/{purchaseOrder}
    public function destroy(PurchaseOrder $purchaseOrder): JsonResponse
    {
        if (! in_array($purchaseOrder->status, ['draft', 'cancelled'])) {
            return response()->json(['message' => 'Only draft or cancelled orders can be deleted.'], 422);
        }

        $purchaseOrder->delete();

        return response()->json(['message' => 'Purchase order deleted.']);
    }
}
