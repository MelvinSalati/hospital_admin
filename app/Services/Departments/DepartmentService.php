<?php

namespace App\Services\Departments;

use App\Repositories\Departments\DepartmentRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DepartmentService
{
    protected DepartmentRepository $departmentRepository;

    /**
     * Create a new class instance.
     */
    public function __construct(DepartmentRepository $departmentRepository)
    {
        $this->departmentRepository = $departmentRepository;
    }

    /**
     * Get all departments.
     */
    public function getDepartments(array $filters = [])
    {
        return $this->departmentRepository->getDepartments($filters);
    }

    /**
     * Get paginated departments.
     */
    public function getPaginatedDepartments(int $perPage = 15, array $filters = [])
    {
        return $this->departmentRepository->getPaginatedDepartments($perPage, $filters);
    }

    /**
     * Get active departments.
     */
    public function getActiveDepartments()
    {
        return $this->departmentRepository->getActiveDepartments();
    }

    /**
     * Get department by ID.
     */
    public function getDepartmentById(int $id)
    {
        return $this->departmentRepository->getDepartmentById($id);
    }

    /**
     * Get department with services.
     */
    public function getDepartmentWithServices(int $id)
    {
        return $this->departmentRepository->getDepartmentWithServices($id);
    }

    /**
     * Get department name.
     */
    public function getDepartmentName(int $departmentId): ?string
    {
        return $this->departmentRepository->getDepartmentName($departmentId);
    }

    /**
     * Create a new department.
     */
    public function createDepartment(array $data)
    {
        try {
            DB::beginTransaction();

            // Validate required fields
            if (empty($data['name'])) {
                throw new \Exception('Department name is required');
            }

            if (empty($data['code'])) {
                throw new \Exception('Department code is required');
            }

            // Check if code already exists
            if ($this->departmentRepository->codeExists($data['code'])) {
                throw new \Exception('Department code already exists');
            }

            $department = $this->departmentRepository->createDepartment($data);

            DB::commit();

            Log::info('Department created successfully', [
                'department_id' => $department->id,
                'department_code' => $department->code,
                'user_id' => auth()->id()
            ]);

            return [
                'success' => true,
                'message' => 'Department created successfully',
                'data' => $department
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create department', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Alias for createDepartment (for backward compatibility).
     */
    public function addDepartment(array $data)
    {
        return $this->createDepartment($data);
    }

    /**
     * Update an existing department.
     */
    public function updateDepartment(int $id, array $data)
    {
        try {
            DB::beginTransaction();

            // Check if department exists
            $department = $this->departmentRepository->getDepartmentById($id);
            if (!$department) {
                throw new \Exception('Department not found');
            }

            // Check if code is being changed and if it already exists
            if (isset($data['code']) && $data['code'] !== $department->code) {
                if ($this->departmentRepository->codeExists($data['code'], $id)) {
                    throw new \Exception('Department code already exists');
                }
            }

            $updated = $this->departmentRepository->updateDepartment($id, $data);

            DB::commit();

            Log::info('Department updated successfully', [
                'department_id' => $id,
                'changes' => array_keys($data),
                'user_id' => auth()->id()
            ]);

            return [
                'success' => true,
                'message' => 'Department updated successfully',
                'data' => $this->departmentRepository->getDepartmentById($id)
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update department', [
                'department_id' => $id,
                'error' => $e->getMessage(),
                'data' => $data
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Delete a department.
     */
    public function deleteDepartment(int $id)
    {
        try {
            DB::beginTransaction();

            $department = $this->departmentRepository->getDepartmentById($id);
            if (!$department) {
                throw new \Exception('Department not found');
            }

            // Check if department has services
            if ($department->services()->count() > 0) {
                throw new \Exception('Cannot delete department with associated services. Please delete or move services first.');
            }

            $this->departmentRepository->deleteDepartment($id);

            DB::commit();

            Log::info('Department deleted successfully', [
                'department_id' => $id,
                'department_name' => $department->name,
                'user_id' => auth()->id()
            ]);

            return [
                'success' => true,
                'message' => 'Department deleted successfully',
                'data' => null
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete department', [
                'department_id' => $id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get department statistics.
     */
    public function getDepartmentStatistics()
    {
        return $this->departmentRepository->getStatistics();
    }

    /**
     * Bulk update department status.
     */
    public function bulkUpdateStatus(array $ids, string $status)
    {
        try {
            DB::beginTransaction();

            $updatedCount = $this->departmentRepository->bulkUpdateStatus($ids, $status);

            DB::commit();

            Log::info('Bulk department status update completed', [
                'updated_count' => $updatedCount,
                'status' => $status,
                'department_ids' => $ids,
                'user_id' => auth()->id()
            ]);

            return [
                'success' => true,
                'message' => "{$updatedCount} departments updated successfully",
                'data' => ['updated_count' => $updatedCount]
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to bulk update department status', [
                'error' => $e->getMessage(),
                'department_ids' => $ids,
                'status' => $status
            ]);

            return [
                'success' => false,
                'message' => 'Failed to update departments',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Search departments.
     */
    public function searchDepartments(string $searchTerm)
    {
        return $this->departmentRepository->searchDepartments($searchTerm);
    }
}
