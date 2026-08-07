<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\BulkStores\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockPricingController extends Controller
{
    public function getProducts(){
        try {
            $products  = DB::table('products')->get(); 
            Log::info('Products retrieved successfully', ['products' => $products]);
            return response()->json([
                'products'  => $products
            ],200);
        } catch(\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ]);
        }
    }  

    public function addPrice(Request $request){
        try{
            $items    = array_merge($request->all(),[
                'pricing_uuid'  => \Illuminate\Support\Facades\Str::uuid()
            ]); 
            $item = \App\Models\BulkStores\ProductPricing::create($items);
            if($item){
                return response()->json([
                    'message'   => 'Pricing added successfully',
                    'data'      => $item
                ],201);
            }
        }catch(\Exception $e){
            return response()->json([
                'message'   => $e->getMessage()
            ],500);
        }
    } 

    public function updatePrice(Request $request, $stockPriceId){

        try{

            $product    =  Product::findOrFail($stockPriceId);     
            $newPrice   =  $product->update($request->all()); 

            if($newPrice){
                response()->json([
                    'message'  => 'Product updated successfully!'
                ],204);
            }
        }catch(\Exception $e){
            return response()->json([
                'message' => $e->getMessage()
            ],500);
        }

    }
}
