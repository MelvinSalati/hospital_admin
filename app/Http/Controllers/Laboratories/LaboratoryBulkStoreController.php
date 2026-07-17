<?php

namespace App\Http\Controllers\Laboratories;

use App\Http\Controllers\Controller;
use App\Services\ProductService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class LaboratoryBulkStoreController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService  = $productService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('laboratories/bulkstore',[
            'products' => $this->productService->getProducts(4)
        ]);
    }

    public function addProduct(Request $request){
        try{
            $data = $request->input('productDetails');
            $validateInputs     = Validator::make($data, [
                'product_name'  => 'required|string',
                'quantity'      => 'required|numeric',
                'category_id'   => 'required|integer',
                'expiry_date'        => 'required|date',
                'product_code'  => 'required|numeric',
                'unit'          => 'required'
            ]);

            if ($validateInputs->fails()) {
                return response()->json([
                    'message'   => $validateInputs->errors()
                ], 500);
            }

            if($this->productService->addProduct($data)){
                return response()->json([
                    'message'   => "Product added successfully!"
                ], 201);
            }

        }catch(\Exception $e){
            return $e->getMessage();
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
