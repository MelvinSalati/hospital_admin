<?php

namespace App\Repositories\Contracts;


interface PatientRepositoryInterface
{
   public function findProductByBarcode(int $barcode);
}
    