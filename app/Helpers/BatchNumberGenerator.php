<?php

namespace App\Helpers;

class BatchNumberGenerator
{
    protected $patientId;
    protected $prefix = "AMH";
    /**
     * Create a new class instance.
     */
    public function __construct($patientId)
    {
        $this->patientId   = $patientId;
    } 


    public  function code(){
         return $this->prefix."-".rand(00000000,99999999);
    } 

    
}
