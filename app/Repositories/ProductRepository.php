<?php

namespace App\Repositories;

use App\Models\Product;
use App\Repositories\Contracts\ProductInterface;


class ProductRepository implements ProductInterface
{
    protected Product $products;
    /**
     * Create a new class instance.
     */
    public function __construct(Product $products)
    {
        $this->products      =  $products;
    } 

    public function create(array $data){
        return $this->products->create($data);
    } 

    public function updateProduct(int $productId, array $data)
    {
        return $this->products->where('id',$productId)->update($data);
    } 

   
    public function getProducts()
    {
        return $this->products->all();  
    } 

    public function findProductsByDepartmentId(int $departmentId){
        return $this->products->where('created_by_department', $departmentId)
        ->limit(4)->get();
    }

}
