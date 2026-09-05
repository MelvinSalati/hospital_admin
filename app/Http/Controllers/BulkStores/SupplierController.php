<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStores\StoreSupplierRequest;
use App\Http\Requests\BulkStores\UpdateSupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia; 
class SupplierController extends Controller
{
    // GET /suppliers
    public function index()
    {
        $suppliers = Supplier::all();

        return Inertia::render('bulkstore/Suppliers',[
            'suppliers' => $suppliers
        ]);
    }

    // POST /suppliers
    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $supplier = Supplier::create($request->validated());

        return response()->json($supplier, 201);
    }

    // GET /suppliers/{supplier}
    public function show(Supplier $supplier): JsonResponse
    {
        $supplier->load(['purchaseOrders' => fn ($q) => $q->latest()->limit(10)]);

        return response()->json($supplier);
    }

    // PUT /suppliers/{supplier}
    public function update(UpdateSupplierRequest $request, Supplier $supplier): JsonResponse
    {
        $supplier->update($request->validated());

        return response()->json($supplier);
    }

    // DELETE /suppliers/{supplier}
    public function destroy(Supplier $supplier): JsonResponse
    {
        $supplier->delete();

        return response()->json(['message' => 'Supplier deleted.']);
    }
}
