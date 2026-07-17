<?php

namespace App\Repositories\Laboratories;

use App\Models\Laboratories\Laboratory;

class LaboratoryRepository
{
    protected $laboratory;
    /**
     * Create a new class instance.
     */
    public function __construct(Laboratory $laboratory)
    {
        $this->laboratory    = $laboratory;
    } 

    public function getAllLaboratoryServices(){
        return $this->laboratory->all();
    }
} 
