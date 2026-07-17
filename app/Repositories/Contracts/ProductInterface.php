<?php 

namespace App\Repositories\Contracts; 


Interface ProductInterface {
    public function create(array $data);
    public function getProducts();
    public function updateProduct(int $productId, array $data);
}