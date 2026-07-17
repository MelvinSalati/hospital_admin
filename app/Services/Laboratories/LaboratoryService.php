<?php

namespace App\Services\Laboratories;

use App\Repositories\Laboratories\LaboratoryRepository;

class LaboratoryService
{
    protected $laboratory;
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
}
