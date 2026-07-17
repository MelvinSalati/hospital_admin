<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStores\StoreSupplierRequest;
use App\Http\Requests\BulkStores\UpdateSupplierRequest;
use App\Models\BulkStores\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    // GET /suppliers
    public function index(Request $request): JsonResponse
    {
        $suppliers = Supplier::query()
            ->when($request->boolean('active_only'), fn ($q) => $q->active())
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            })
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($suppliers);
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
