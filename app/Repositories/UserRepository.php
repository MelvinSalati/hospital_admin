<?php
// app/Repositories/UserRepository.php

namespace App\Repositories;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserRepository extends BaseRepository
{
    protected function setTable(): void
    {
        $this->table = 'users';
    }

    /**
     * Get users list with filters
     */
    public function getUsersList(array $filters = [], $perPage = 15)
    {
        $query = DB::table('users')
            ->leftJoin('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->leftJoin('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->whereNull('users.deleted_at')
            ->select(
                'users.*',
                DB::raw('GROUP_CONCAT(roles.name) as role_names'),
                DB::raw('GROUP_CONCAT(roles.id) as role_ids')
            );

        // Apply filters
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('users.first_name', 'like', "%{$search}%")
                    ->orWhere('users.last_name', 'like', "%{$search}%")
                    ->orWhere('users.email', 'like', "%{$search}%")
                    ->orWhere('users.phone', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['role'])) {
            $query->where('roles.name', $filters['role']);
        }

        if (!empty($filters['department'])) {
            $query->where('users.department', $filters['department']);
        }

        if (isset($filters['is_active'])) {
            $query->where('users.is_active', $filters['is_active']);
        }

        if (!empty($filters['gender'])) {
            $query->where('users.gender', $filters['gender']);
        }

        $query->groupBy('users.id');

        $orderBy = $filters['order_by'] ?? 'users.created_at';
        $orderDir = $filters['order_dir'] ?? 'desc';
        $query->orderBy($orderBy, $orderDir);

        return $this->paginateResults($query, $perPage);
    }

    /**
     * Get user details with roles
     */
    public function getUserDetails($id)
    {
        $user = DB::table('users')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$user) {
            return null;
        }

        $roles = DB::table('model_has_roles')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('model_has_roles.model_id', $id)
            ->where('model_has_roles.model_type', 'App\\Models\\User')
            ->select('roles.*')
            ->get();

        $permissions = DB::table('model_has_permissions')
            ->join('permissions', 'model_has_permissions.permission_id', '=', 'permissions.id')
            ->where('model_has_permissions.model_id', $id)
            ->where('model_has_permissions.model_type', 'App\\Models\\User')
            ->select('permissions.*')
            ->get();

        $departmentId =  DB::table('user_profile')->where('user_id',$id)->value('department_id');
        return [
            'user' => $user,
            'roles' => $roles,
            'permissions' => $permissions,
            'department_id' => $departmentId
        ];
    }

    /**
     * Create new user
     */
    public function createUser(array $data)
    {
        try {
            $this->beginTransaction();

            // Hash password
            if (isset($data['password'])) {
                $data['password'] = Hash::make($data['password']);
            }

            $data['created_at'] = now();
            $data['updated_at'] = now();

            $id = DB::table('users')->insertGetId($data);

            // Assign roles
            if (!empty($data['roles'])) {
                foreach ($data['roles'] as $roleId) {
                    DB::table('model_has_roles')->insert([
                        'role_id' => $roleId,
                        'model_type' => 'App\\Models\\User',
                        'model_id' => $id
                    ]);
                }
            }

            // Assign permissions
            if (!empty($data['permissions'])) {
                foreach ($data['permissions'] as $permissionId) {
                    DB::table('model_has_permissions')->insert([
                        'permission_id' => $permissionId,
                        'model_type' => 'App\\Models\\User',
                        'model_id' => $id
                    ]);
                }
            }

            $this->commit();

            return $this->getUserDetails($id);
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Update user
     */
    public function updateUser($id, array $data)
    {
        try {
            $this->beginTransaction();

            // Hash password if provided
            if (isset($data['password'])) {
                $data['password'] = Hash::make($data['password']);
            }

            $data['updated_at'] = now();

            DB::table('users')
                ->where('id', $id)
                ->update($data);

            // Update roles
            if (isset($data['roles'])) {
                // Remove existing roles
                DB::table('model_has_roles')
                    ->where('model_id', $id)
                    ->where('model_type', 'App\\Models\\User')
                    ->delete();

                // Add new roles
                foreach ($data['roles'] as $roleId) {
                    DB::table('model_has_roles')->insert([
                        'role_id' => $roleId,
                        'model_type' => 'App\\Models\\User',
                        'model_id' => $id
                    ]);
                }
            }

            // Update permissions
            if (isset($data['permissions'])) {
                // Remove existing permissions
                DB::table('model_has_permissions')
                    ->where('model_id', $id)
                    ->where('model_type', 'App\\Models\\User')
                    ->delete();

                // Add new permissions
                foreach ($data['permissions'] as $permissionId) {
                    DB::table('model_has_permissions')->insert([
                        'permission_id' => $permissionId,
                        'model_type' => 'App\\Models\\User',
                        'model_id' => $id
                    ]);
                }
            }

            $this->commit();

            return $this->getUserDetails($id);
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Delete user (soft delete)
     */
    public function deleteUser($id)
    {
        return DB::table('users')
            ->where('id', $id)
            ->update(['deleted_at' => now()]);
    }

    /**
     * Get doctors list
     */
    public function getDoctorsList(array $filters = [])
    {
        $query = DB::table('users')
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('roles.name', 'doctor')
            ->whereNull('users.deleted_at')
            ->select('users.*');

        if (!empty($filters['specialization'])) {
            $query->where('users.specialization', $filters['specialization']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('users.first_name', 'like', "%{$search}%")
                    ->orWhere('users.last_name', 'like', "%{$search}%")
                    ->orWhere('users.email', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('users.first_name')
            ->get();
    }

    /**
     * Get user by email
     */
    public function findByEmail($email)
    {
        return DB::table('users')
            ->where('email', $email)
            ->whereNull('deleted_at')
            ->first();
    }

    /**
     * Update last login
     */
    public function updateLastLogin($id, $ip)
    {
        return DB::table('users')
            ->where('id', $id)
            ->update([
                'last_login_at' => now(),
                'last_login_ip' => $ip,
                'updated_at' => now()
            ]);
    }

    /**
     * Get users count by role
     */
    public function getCountByRole()
    {
        return DB::table('model_has_roles')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->select('roles.name', DB::raw('COUNT(*) as count'))
            ->groupBy('roles.name')
            ->get();
    }

    /**
     * Get active users count
     */
    public function getActiveCount()
    {
        return DB::table('users')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->count();
    }

    /**
     * Paginate results
     */
    private function paginateResults($query, $perPage)
    {
        $page = request()->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $total = $query->getCountForPagination();

        $data = $query->offset($offset)
            ->limit($perPage)
            ->get();

        return [
            'data' => $data,
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => (int)$page,
                'last_page' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total)
            ]
        ];
    }
}
