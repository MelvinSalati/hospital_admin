<?php

namespace App\Services\Laboratories;

use App\Repositories\Laboratories\LaboratoryRepository;

class LaboratoryService
{
    protected LaboratoryRepository $laboratory;
    /**
     * Create a new class instance.
     */
    public function __construct(LaboratoryRepository $laboratory)
    {
        $this->laboratory       = $laboratory;
    }

    public function  getAllLaboratoryTests(){
        return $this->laboratory->getAllLaboratoryServices();
    }

    public function createLaboratoryOrder(array $laboratoryOrderDetails){
        try{
           return $this->laboratory->createLaboratoryOrder($laboratoryOrderDetails);
        }catch(\Exception $e){
            return response()->json([
                'message'   => $e->getMessage()
            ],500);
        }
    }
}
