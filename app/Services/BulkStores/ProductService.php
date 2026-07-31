<?php

namespace App\Services\BulkStores;


use App\Repositories\BulkStores\ProductRepository;

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
    
    public function findProduct(int $barcode)
    {
        return $this->productRepository->findProductByBarcode($barcode);
    }
}
