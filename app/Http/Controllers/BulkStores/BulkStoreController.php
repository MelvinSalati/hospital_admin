<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStores\StoreBulkStoreRequest;
use App\Http\Requests\BulkStores\UpdateBulkStoreRequest;
use App\Models\BulkStores\BulkStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Supplier; 

class BulkStoreController extends Controller
{
    // GET /bulk-stores
    public function index()
    {
        return Inertia::render('bulkstore/dashboard');
    }
 
    public function orders()
    {
        return Inertia::render('bulkstore/orders',[
            'orders'    => [],
        ]);
    }

    public function issues()
    {
        return Inertia::render('bulkstore/issues', [
            'issues'    => [],
        ]);
    }
    public function products()
    {
        return Inertia::render('bulkstore/products',[
            'products' => []
            ]);
    }
    public function suppliers()
    {
        $suppliers =  Supplier::all();
        return Inertia::render('bulkstore/suppliers',[
            'suppliers' => $suppliers
        ]);
    }
    // POST /bulk-stores
    public function store(StoreBulkStoreRequest $request): JsonResponse
    {
        $store = BulkStore::create($request->validated());

        return response()->json($store, 201);
    }

    // GET /bulk-stores/{bulkStore}
    public function show(BulkStore $bulkStore): JsonResponse
    {
        $bulkStore->load(['items.product']);

        return response()->json($bulkStore);
    }

    // PUT /bulk-stores/{bulkStore}
    public function update(UpdateBulkStoreRequest $request, BulkStore $bulkStore): JsonResponse
    {
        $bulkStore->update($request->validated());

        return response()->json($bulkStore);
    }

    // DELETE /bulk-stores/{bulkStore}
    public function destroy(BulkStore $bulkStore): JsonResponse
    {
        $bulkStore->delete();

        return response()->json(['message' => 'Bulk store deleted.']);
    }
}
