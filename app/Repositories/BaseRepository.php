<?php

namespace App\Repositories;

use Illuminate\Support\Facades\DB;
use App\Repositories\Contracts\BaseRepositoryInterface;

abstract class BaseRepository implements BaseRepositoryInterface
{
    protected $table;
    protected $primaryKey = 'id';

    public function __construct()
    {
        $this->setTable();
    }

    abstract protected function setTable(): void;

    /**
     * Get all records
     */
    public function all($columns = ['*'])
    {
        return DB::table($this->table)
            ->whereNull('deleted_at')
            ->orderBy('id', 'desc')
            ->get($columns);
    }

    /**
     * Paginate records
     */
    public function paginate($perPage = 15, $columns = ['*'])
    {
        $page = request()->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $data = DB::table($this->table)
            ->whereNull('deleted_at')
            ->orderBy('id', 'desc')
            ->offset($offset)
            ->limit($perPage)
            ->get($columns);

        $total = DB::table($this->table)->whereNull('deleted_at')->count();

        return [
            'data' => $data,
            'current_page' => (int)$page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => ceil($total / $perPage),
            'from' => $offset + 1,
            'to' => min($offset + $perPage, $total)
        ];
    }

    /**
     * Find record by ID
     */
    public function find($id, $columns = ['*'])
    {
        return DB::table($this->table)
            ->where($this->primaryKey, $id)
            ->whereNull('deleted_at')
            ->first($columns);
    }

    /**
     * Find records where conditions
     */
    public function findWhere(array $conditions, $columns = ['*'])
    {
        $query = DB::table($this->table)->whereNull('deleted_at');

        foreach ($conditions as $field => $value) {
            if (is_array($value)) {
                $query->whereIn($field, $value);
            } else {
                $query->where($field, $value);
            }
        }

        return $query->get($columns);
    }

    /**
     * Find first record where conditions
     */
    public function findWhereFirst(array $conditions, $columns = ['*'])
    {
        $query = DB::table($this->table)->whereNull('deleted_at');

        foreach ($conditions as $field => $value) {
            $query->where($field, $value);
        }

        return $query->first($columns);
    }

    /**
     * Create new record
     */
    public function create(array $data)
    {
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table($this->table)->insertGetId($data);

        return $this->find($id);
    }

    /**
     * Update record
     */
    public function update($id, array $data)
    {
        $data['updated_at'] = now();

        DB::table($this->table)
            ->where($this->primaryKey, $id)
            ->update($data);

        return $this->find($id);
    }

    /**
     * Delete record (soft delete)
     */
    public function delete($id)
    {
        return DB::table($this->table)
            ->where($this->primaryKey, $id)
            ->update(['deleted_at' => now()]);
    }

    /**
     * Check if record exists
     */
    public function exists(array $conditions): bool
    {
        $query = DB::table($this->table);

        foreach ($conditions as $field => $value) {
            $query->where($field, $value);
        }

        return $query->exists();
    }

    /**
     * Count records
     */
    public function count(array $conditions = []): int
    {
        $query = DB::table($this->table)->whereNull('deleted_at');

        foreach ($conditions as $field => $value) {
            $query->where($field, $value);
        }

        return $query->count();
    }

    /**
     * Begin transaction
     */
    public function beginTransaction()
    {
        DB::beginTransaction();
    }

    /**
     * Commit transaction
     */
    public function commit()
    {
        DB::commit();
    }

    /**
     * Rollback transaction
     */
    public function rollback()
    {
        DB::rollBack();
    }

    /**
     * Raw query execution
     */
    protected function raw($query, $bindings = [])
    {
        return DB::select($query, $bindings);
    }
}
