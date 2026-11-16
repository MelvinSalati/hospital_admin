<?php

namespace App\Services\Billables;

use App\Repositories\Billables\Billable as BillableRepository;
use Illuminate\Database\Eloquent\Collection;

class Billable
{
    /**
     * Billable repository instance.
     *
     * @var BillableRepository
     */
    protected BillableRepository $repository;

    /**
     * Initialize the Billable service.
     *
     * @param BillableRepository $repository
     */
    public function __construct(BillableRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * Register a new billable service.
     *
     * @param array $data
     * @return mixed
     */
    public function create(array $data)
    {
        return $this->repository->create($data);
    }

    /**
     * Update an existing billable service.
     *
     * @param array $serviceDetails
     * @param int $serviceId
     * @return bool
     */
    public function updateService(array $serviceDetails, int $serviceId): bool
    {
        return $this->repository->updateService($serviceDetails, $serviceId);
    }

    /**
     * Retrieve services belonging to a department.
     *
     * @param int $departmentId
     * @return Collection
     */
    public function getServices(int $departmentId): Collection
    {
        return $this->repository->getServices($departmentId);
    }
}
