<?php

namespace App\Services\Receptions;

use App\Repositories\Receptions\ReceptionRepository;

class ReceptionService
{
    protected ReceptionRepository $receptionRepository;
    /**
     * Create a new class instance.
     */
    public function __construct(ReceptionRepository $repository)
    {
        $this->receptionRepository       =  $repository;
    } 


    public  function getDashboard() : array {
        return $this->receptionRepository->dashboard();
    }
}
