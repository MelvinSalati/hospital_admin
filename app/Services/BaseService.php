<?php
// app/Services/BaseService.php

namespace App\Services;

use App\Repositories\BaseRepositoryInterface;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

abstract class BaseService
{
    protected $repository;

    public function __construct(BaseRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    /**
     * Get all records
     */
    public function all(array $columns = ['*'])
    {
        return $this->repository->all($columns);
    }

    /**
     * Get paginated records
     */
    public function paginate($perPage = 15, array $columns = ['*'])
    {
        return $this->repository->paginate($perPage, $columns);
    }

    /**
     * Find record by ID
     */
    public function find($id, array $columns = ['*'])
    {
        $result = $this->repository->find($id, $columns);

        if (!$result) {
            throw new \Exception('Record not found');
        }

        return $result;
    }

    /**
     * Create new record
     */
    public function create(array $data)
    {
        $this->validate($data);

        return $this->repository->create($data);
    }

    /**
     * Update record
     */
    public function update($id, array $data)
    {
        $this->validate($data, $id);

        return $this->repository->update($id, $data);
    }

    /**
     * Delete record
     */
    public function delete($id)
    {
        return $this->repository->delete($id);
    }

    /**
     * Validate data (to be overridden by child classes)
     */
    protected function validate(array $data, $id = null): void
    {
        // Override in child classes
    }

    /**
     * Begin transaction
     */
    public function beginTransaction()
    {
        $this->repository->beginTransaction();
    }

    /**
     * Commit transaction
     */
    public function commit()
    {
        $this->repository->commit();
    }

    /**
     * Rollback transaction
     */
    public function rollback()
    {
        $this->repository->rollback();
    }
}
