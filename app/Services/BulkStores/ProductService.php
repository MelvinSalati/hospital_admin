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

    /**
     * Find a product by barcode
     */
    public function findProduct(int $barcode)
    {
        return $this->productRepository->findProductByBarcode($barcode);
    }

    /**
     * add a product 
     */
    public function addProduct(array $productDetails){
        return $this->productRepository->create($productDetails);
    }

    /**
     * get products adjusted in the system
     */ 
       public function getAdjustedStock(){
        return $this->productRepository->getAdjustedStock();
          }
    /**
     * Get all products with stock and expiry data
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProducts()
    {
        return $this->productRepository->getProducts();
    }
 /**
     * Get all products with stock and expiry data
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProduct()
    {
        return $this->productRepository->getProductAdjustment();
    }

    /**
     * all stocks with for pricing 
     */
    public function getProductsWithStock(){
          return $this->productRepository->getProductsWithStock();
    }

    public function addPrice(array $serviceDetails){
        return $this->productRepository->addPrice($serviceDetails);
    }
    /**
     * Get products with pagination
     * 
     * @param int $perPage
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProductsPaginated($perPage = 15)
    {
        return $this->productRepository->getProductsPaginated($perPage);
    }

    /**
     * Get a single product by ID with full details
     * 
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProductById($id)
    {
        return $this->productRepository->getProductById($id);
    }

    /**
     * Get products by category
     * 
     * @param int $categoryId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProductsByCategory($categoryId)
    {
        return $this->productRepository->getProductsByCategory($categoryId);
    }

    /**
     * Get all categories
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCategories()
    {
        return $this->productRepository->getCategories();
    }

    /**
     * Get products with filters (search, category, expiry status, stock status)
     * 
     * @param array $filters
     * @return \Illuminate\Http\JsonResponse
     */
    public function getFilteredProducts(array $filters)
    {
        return $this->productRepository->getFilteredProducts($filters);
    }
}
