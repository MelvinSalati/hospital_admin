<?php

namespace App\Repositories\BulkStores;

use App\Models\BulkStores\Product;
use App\Repositories\Contracts\PatientRepositoryInterface;

class ProductRepository implements PatientRepositoryInterface
{
    public function findProductByBarcode(int $barcode)
    {
        return Product::all();
    }
}
