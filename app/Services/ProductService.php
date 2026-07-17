<?php

namespace App\Services;


use App\Repositories\ProductRepository;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ProductService
{
    protected ProductRepository $productRepository;
    /**
     * Create a new class instance.
     */
    public function __construct(ProductRepository $productRepository)
    {
        $this->productRepository = $productRepository;
    }

    public function addProduct($data){
        $data = array_merge([
            'product_uuid'  => Str::uuid()
        ], $data);
        return $this->productRepository->create($data);
    } 

    public function getProducts($departmentId){
        return $this->productRepository->findProductsByDepartmentId($departmentId);
    }
}
