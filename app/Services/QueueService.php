<?php

namespace App\Services;

use App\Repositories\QueueRepository;
use PDO;

class QueueService
{
    protected QueueRepository $queueRepository;
    /**
     * Create a new class instance.
     */
    public function __construct(QueueRepository $queueRepository)
    {
        $this->queueRepository   = $queueRepository;
    } 


    public function createVisit(array $data){
        return $this->queueRepository->create($data);
    }

    public function getQueue(int $departmentId)
    {
        return $this->queueRepository->getQueue($departmentId);
    }

   
}
