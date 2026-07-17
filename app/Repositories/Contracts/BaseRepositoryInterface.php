<?php


namespace App\Repositories\Contracts;

interface BaseRepositoryInterface
{
    public function all($columns = ['*']);
    public function paginate($perPage = 15, $columns = ['*']);
    public function find($id, $columns = ['*']);
    public function findWhere(array $conditions, $columns = ['*']);
    public function findWhereFirst(array $conditions, $columns = ['*']);
    public function create(array $data);
    public function update($id, array $data);
    public function delete($id);
    public function exists(array $conditions);
    public function count(array $conditions = []);
    public function beginTransaction();
    public function commit();
    public function rollback();
}
