<?php

namespace App\Repositories\Departments;

use App\Models\Departments\Department;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class DepartmentRepository
{
    protected Department $departmentModel;

    public function __construct(Department $departmentModel)
    {
        $this->departmentModel = $departmentModel;
    }

    /**
     * Get all departments with optional filters.
     */
    public function getDepartments(array $filters = []): Collection
    {
        $query = $this->departmentModel->withCount('services');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('code', 'like', '%' . $filters['search'] . '%');
            });
        }

        return $query->orderBy('name')->get([
            "id",
            "name",
            "code",
            "description",
            "status",
            "created_at"
        ]);
    }

    /**
     * Get paginated departments.
     */
    public function getPaginatedDepartments(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = $this->departmentModel->withCount('services');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['search'] . '%')
                    ->orWhere('code', 'like', '%' . $filters['search'] . '%');
            });
        }

        return $query->orderBy('name')->paginate($perPage);
    }

    /**
     * Get active departments only.
     */
    public function getActiveDepartments(): Collection
    {
        return $this->departmentModel->where('status', 'active')
            ->withCount('services')
            ->orderBy('name')
            ->get([
                "id",
                "name",
                "code",
                "description"
            ]);
    }

    /**
     * Get department by ID.
     */
    public function getDepartmentById(int $id): ?Department
    {
        return $this->departmentModel->with('services')->find($id);
    }

    /**
     * Get department name by ID.
     */
    public function getDepartmentName(int $departmentId): ?string
    {
        $department = $this->departmentModel->find($departmentId);
        return $department ? $department->name : null;
    }

    /**
     * Get department with services.
     */
    public function getDepartmentWithServices(int $departmentId): ?Department
    {
        return $this->departmentModel->with(['services' => function ($query) {
            $query->orderBy('service_name');
        }])->find($departmentId);
    }

    /**
     * Create a new department.
     */
    public function createDepartment(array $data): Department
    {
        return $this->departmentModel->create([
            'name' => $data['name'],
            'code' => strtoupper($data['code']),
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'active',
        ]);
    }

    /**
     * Update an existing department.
     */
    public function updateDepartment(int $id, array $data): bool
    {
        $department = $this->departmentModel->find($id);

        if (!$department) {
            throw new \Exception('Department not found');
        }

        return $department->update([
            'name' => $data['name'] ?? $department->name,
            'code' => isset($data['code']) ? strtoupper($data['code']) : $department->code,
            'description' => $data['description'] ?? $department->description,
            'department_uuid' => Str::uuid(),
            'status' => $data['status'] ?? $department->status,
        ]);
    }

    /**
     * Delete a department.
     */
    public function deleteDepartment(int $id): bool
    {
        $department = $this->departmentModel->find($id);

        if (!$department) {
            throw new \Exception('Department not found');
        }

        // Check if department has services
        if ($department->services()->count() > 0) {
            throw new \Exception('Cannot delete department with associated services');
        }

        return $department->delete();
    }

    /**
     * Check if department code exists.
     */
    public function codeExists(string $code, ?int $excludeId = null): bool
    {
        $query = $this->departmentModel->where('code', $code);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * Get department statistics.
     */
    public function getStatistics(): array
    {
        return [
            'total' => $this->departmentModel->count(),
            'active' => $this->departmentModel->where('status', 'active')->count(),
            'inactive' => $this->departmentModel->where('status', 'inactive')->count(),
            'with_services' => $this->departmentModel->has('services')->count(),
            'without_services' => $this->departmentModel->doesntHave('services')->count(),
        ];
    }

    /**
     * Bulk update department status.
     */
    public function bulkUpdateStatus(array $ids, string $status): int
    {
        return $this->departmentModel->whereIn('id', $ids)
            ->update(['status' => $status]);
    }

    /**
     * Search departments.
     */
    public function searchDepartments(string $searchTerm): Collection
    {
        return $this->departmentModel->where('name', 'like', '%' . $searchTerm . '%')
            ->orWhere('code', 'like', '%' . $searchTerm . '%')
            ->orWhere('description', 'like', '%' . $searchTerm . '%')
            ->withCount('services')
            ->orderBy('name')
            ->get();
    }
}
