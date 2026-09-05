<?php

namespace App\Warehouse;

use App\Repositories\WarehouseRepository;

class DataStorage
{
    protected  WarehouseRepository $repositoryWarehouse; 
    /**
     * Create a new class instance.
     */
    public function __construct(WarehouseRepository $repository)
    {
        $this->repositoryWarehouse      =   $repository;
    }

    /**
     *  This method handles data storage
     *  parameters include the following  
     *  param @array
     * 
     */

    private function store(){

    }
}
