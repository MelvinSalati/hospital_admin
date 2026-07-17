<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStores\AdjustStockRequest;
use App\Http\Requests\BulkStores\IssueStockRequest;
use App\Http\Requests\BulkStores\ReceiveStockRequest;
use App\Http\Requests\BulkStores\TransferStockRequest;
use App\Models\BulkStores\StockMovement;
use App\Services\BulkStores\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class StockMovementController extends Controller
{
    public function __construct(private readonly StockService $stockService) {}

    // -------------------------------------------------------------------------
    // List movements (with filters)
    // GET /stock-movements
    // -------------------------------------------------------------------------

    public function index(Request $request): JsonResponse
    {
        $movements = StockMovement::query()
            ->with(['product', 'bulkStore', 'supplier', 'fromDepartment', 'toDepartment', 'createdBy'])
            ->when($request->filled('type'),         fn ($q) => $q->ofType($request->type))
            ->when($request->filled('product_id'),   fn ($q) => $q->forProduct($request->integer('product_id')))
            ->when($request->filled('store_id'),     fn ($q) => $q->forStore($request->integer('store_id')))
            ->when($request->filled('from'),         fn ($q) => $q->where('moved_at', '>=', $request->from))
            ->when($request->filled('to'),           fn ($q) => $q->where('moved_at', '<=', $request->to))
            ->latest('moved_at')
            ->paginate($request->integer('per_page', 20));

        return response()->json($movements);
    }

    // GET /stock-movements/{stockMovement}
    public function show(StockMovement $stockMovement): JsonResponse
    {
        $stockMovement->load(['product', 'bulkStore', 'supplier', 'fromDepartment', 'toDepartment', 'createdBy']);

        return response()->json($stockMovement);
    }

    // -------------------------------------------------------------------------
    // RECEIVE  –  POST /stock-movements/receive
    // -------------------------------------------------------------------------

    public function receive(ReceiveStockRequest $request): JsonResponse
    {
        try {
            $movement = $this->stockService->receive($request->validated());

            return response()->json([
                'message'  => 'Stock received successfully.',
                'movement' => $movement->load('product'),
            ], 201);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // -------------------------------------------------------------------------
    // ISSUE  –  POST /stock-movements/issue
    // -------------------------------------------------------------------------

    public function issue(IssueStockRequest $request): JsonResponse
    {
        try {
            $movement = $this->stockService->issue($request->validated());

            return response()->json([
                'message'  => 'Stock issued successfully.',
                'movement' => $movement->load(['product', 'toDepartment']),
            ], 201);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // -------------------------------------------------------------------------
    // TRANSFER  –  POST /stock-movements/transfer
    // -------------------------------------------------------------------------

    public function transfer(TransferStockRequest $request): JsonResponse
    {
        try {
            $movement = $this->stockService->transfer($request->validated());

            return response()->json([
                'message'  => 'Stock transferred successfully.',
                'movement' => $movement->load('product'),
            ], 201);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // -------------------------------------------------------------------------
    // ADJUST  –  POST /stock-movements/adjust
    // -------------------------------------------------------------------------

    public function adjust(AdjustStockRequest $request): JsonResponse
    {
        try {
            $movement = $this->stockService->adjust($request->validated());

            return response()->json([
                'message'  => 'Stock adjusted successfully.',
                'movement' => $movement->load('product'),
            ], 201);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
