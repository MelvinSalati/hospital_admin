<?php

namespace App\Http\Controllers\Pharmacies;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index(){
        return Inertia::render('pharmacies/suppliers',[
            'suppliers' => Supplier::all()
        ]);
    }
    /**
     * Store a newly created supplier in storage.
     */
    public function storeSupplier(Request $request)
    {
        // Validate the incoming request
        $validator = Validator::make($request->all(), [
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code',
            'supplier_name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'mobile' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255|unique:suppliers,email',
            'website' => 'nullable|url|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state_province' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'tax_number' => 'nullable|string|max:100',
            'business_registration' => 'nullable|string|max:100',
            'license_number' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:50',
            'delivery_terms' => 'nullable|string|max:50',
            'currency' => 'nullable|string|max:10',
            'credit_limit' => 'nullable|numeric|min:0',
            'current_balance' => 'nullable|numeric|min:0',
            'rating' => 'nullable|integer|min:1|max:5',
            'performance_score' => 'nullable|numeric|min:0|max:100',
            'delivery_reliability' => 'nullable|numeric|min:0|max:100',
            'quality_rating' => 'nullable|numeric|min:0|max:100',
            'supplier_type' => 'nullable|string|max:50',
            'supplier_category' => 'nullable|string|max:100',
            'product_categories' => 'nullable|string',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:100',
            'bank_swift' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'is_preferred' => 'nullable|boolean',
            'is_approved' => 'nullable|boolean',
        ]);

        // Return validation errors if any
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Generate supplier code if not provided
            $supplierCode = $request->supplier_code ?? $this->generateSupplierCode();

            // Create the supplier
            $supplier = Supplier::create([
                'supplier_code' => $supplierCode,
                'supplier_name' => $request->supplier_name,
                'contact_person' => $request->contact_person,
                'phone' => $request->phone,
                'mobile' => $request->mobile,
                'email' => $request->email,
                'website' => $request->website,
                'address' => $request->address,
                'city' => $request->city,
                'state_province' => $request->state_province,
                'country' => $request->country ?? 'Zambia',
                'postal_code' => $request->postal_code,
                'tax_number' => $request->tax_number,
                'business_registration' => $request->business_registration,
                'license_number' => $request->license_number,
                'payment_terms' => $request->payment_terms ?? 'Net 30',
                'delivery_terms' => $request->delivery_terms ?? 'FOB',
                'currency' => $request->currency ?? 'ZMW',
                'credit_limit' => $request->credit_limit ?? 0,
                'current_balance' => $request->current_balance ?? 0,
                'rating' => $request->rating ?? 3,
                'performance_score' => $request->performance_score,
                'delivery_reliability' => $request->delivery_reliability,
                'quality_rating' => $request->quality_rating,
                'supplier_type' => $request->supplier_type ?? 'Local',
                'supplier_category' => $request->supplier_category,
                'product_categories' => $request->product_categories,
                'bank_name' => $request->bank_name,
                'bank_account' => $request->bank_account,
                'bank_swift' => $request->bank_swift,
                'notes' => $request->notes,
                'internal_notes' => $request->internal_notes,
                'is_approved' => $request->is_approved ?? 0,
                'is_active' => $request->is_active ?? 1,
                'is_preferred' => $request->is_preferred ?? 0,
                'is_blacklisted' => 0,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Supplier created successfully',
                'data' => $supplier,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create supplier',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate a unique supplier code
     */
    private function generateSupplierCode()
    {
        $prefix = 'SUP';
        $year = date('Y');
        $month = date('m');

        // Get the last inserted supplier
        $lastSupplier = Supplier::orderBy('id', 'desc')->first();

        if ($lastSupplier) {
            $lastId = $lastSupplier->id + 1;
        } else {
            $lastId = 1;
        }

        return $prefix . '-' . $year . '-' . $month . '-' . str_pad($lastId, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Update an existing supplier
     */
    public function updateSupplier(Request $request, $id)
    {
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'Supplier not found'
            ], 404);
        }

        // Validate the incoming request
        $validator = Validator::make($request->all(), [
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code,' . $id,
            'supplier_name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'mobile' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255|unique:suppliers,email,' . $id,
            'website' => 'nullable|url|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state_province' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'tax_number' => 'nullable|string|max:100',
            'business_registration' => 'nullable|string|max:100',
            'license_number' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:50',
            'delivery_terms' => 'nullable|string|max:50',
            'currency' => 'nullable|string|max:10',
            'credit_limit' => 'nullable|numeric|min:0',
            'current_balance' => 'nullable|numeric|min:0',
            'rating' => 'nullable|integer|min:1|max:5',
            'performance_score' => 'nullable|numeric|min:0|max:100',
            'delivery_reliability' => 'nullable|numeric|min:0|max:100',
            'quality_rating' => 'nullable|numeric|min:0|max:100',
            'supplier_type' => 'nullable|string|max:50',
            'supplier_category' => 'nullable|string|max:100',
            'product_categories' => 'nullable|string',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:100',
            'bank_swift' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'is_preferred' => 'nullable|boolean',
            'is_approved' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Update the supplier
            $supplier->update([
                'supplier_code' => $request->supplier_code,
                'supplier_name' => $request->supplier_name,
                'contact_person' => $request->contact_person,
                'phone' => $request->phone,
                'mobile' => $request->mobile,
                'email' => $request->email,
                'website' => $request->website,
                'address' => $request->address,
                'city' => $request->city,
                'state_province' => $request->state_province,
                'country' => $request->country ?? 'Zambia',
                'postal_code' => $request->postal_code,
                'tax_number' => $request->tax_number,
                'business_registration' => $request->business_registration,
                'license_number' => $request->license_number,
                'payment_terms' => $request->payment_terms,
                'delivery_terms' => $request->delivery_terms,
                'currency' => $request->currency,
                'credit_limit' => $request->credit_limit,
                'current_balance' => $request->current_balance,
                'rating' => $request->rating,
                'performance_score' => $request->performance_score,
                'delivery_reliability' => $request->delivery_reliability,
                'quality_rating' => $request->quality_rating,
                'supplier_type' => $request->supplier_type,
                'supplier_category' => $request->supplier_category,
                'product_categories' => $request->product_categories,
                'bank_name' => $request->bank_name,
                'bank_account' => $request->bank_account,
                'bank_swift' => $request->bank_swift,
                'notes' => $request->notes,
                'internal_notes' => $request->internal_notes,
                'is_approved' => $request->is_approved ?? 0,
                'is_active' => $request->is_active ?? 1,
                'is_preferred' => $request->is_preferred ?? 0,
                'updated_by' => auth()->id(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Supplier updated successfully',
                'data' => $supplier,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update supplier',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a supplier
     */
    public function deleteSupplier($id)
    {
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'Supplier not found'
            ], 404);
        }

        try {
            $supplier->delete();

            return response()->json([
                'success' => true,
                'message' => 'Supplier deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete supplier',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all suppliers with pagination
     */
    public function getSuppliers(Request $request)
    {
        $search = $request->get('search');
        $perPage = $request->get('per_page', 15);

        $query = Supplier::query();

        if ($search) {
            $query->where('supplier_name', 'LIKE', "%{$search}%")
                ->orWhere('supplier_code', 'LIKE', "%{$search}%")
                ->orWhere('contact_person', 'LIKE', "%{$search}%")
                ->orWhere('phone', 'LIKE', "%{$search}%")
                ->orWhere('email', 'LIKE', "%{$search}%");
        }

        $suppliers = $query->orderBy('supplier_name')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $suppliers,
        ]);
    }

    /**
     * Get a single supplier by ID
     */
    public function getSupplier($id)
    {
        $supplier = Supplier::with(['products', 'purchaseOrders'])->find($id);

        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'Supplier not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $supplier,
        ]);
    }

    /**
     * Toggle supplier active status
     */
    public function toggleSupplierStatus($id)
    {
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'Supplier not found'
            ], 404);
        }

        try {
            $supplier->update([
                'is_active' => !$supplier->is_active,
                'updated_by' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Supplier status updated successfully',
                'is_active' => $supplier->is_active,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
