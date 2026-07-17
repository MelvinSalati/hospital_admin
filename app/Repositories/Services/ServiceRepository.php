<?php

namespace App\Repositories\Services;

use App\Models\Services\Service;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class ServiceRepository
{
    protected Service $model;

    /**
     * Create a new class instance.
     */
    public function __construct(Service $model)
    {
        $this->model = $model;
    }

    /**
     * Get all services with optional filters.
     */
    public function getAll(array $filters = []): Collection
    {
        $query = $this->model->with('department');

        if (!empty($filters['department_id'])) {
            $query->where('department_id', $filters['department_id']);
        }

        if (!empty($filters['search'])) {
            $query->where('service_name', 'like', '%' . $filters['search'] . '%');
        }

        if (!empty($filters['has_price'])) {
            $query->where(function ($q) {
                $q->where('cash_price', '>', 0)
                    ->orWhere('nhima_price', '>', 0)
                    ->orWhere('insurance_price', '>', 0)
                    ->orWhere('charity_price', '>', 0);
            });
        }

        return $query->orderBy('service_name')->get();
    }

    /**
     * Get paginated services.
     */
    public function getPaginated(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = $this->model->with('department');

        if (!empty($filters['department_id'])) {
            $query->where('department_id', $filters['department_id']);
        }

        if (!empty($filters['search'])) {
            $query->where('service_name', 'like', '%' . $filters['search'] . '%');
        }

        return $query->orderBy('service_name')->paginate($perPage);
    }

    /**
     * Get services by department.
     */
    public function getByDepartment(int $departmentId): Collection
    {
        return $this->model->where('department_id', $departmentId)
            ->orderBy('service_name')
            ->get();
    }

    /**
     * Find service by ID.
     */
    public function findById(int $id): ?Service
    {
        return $this->model->with('department')->find($id);
    }

    /**
     * Find service by UUID.
     */
    public function findByUuid(int $serviceUuid): ?Service
    {
        return $this->model->where('service_uuid', $serviceUuid)->first();
    }

    /**
     * Create a new service.
     */
    public function create(array $data): Service
    {
        return $this->model->create($data);
    }

    /**
     * Update an existing service.
     */
    public function update(int $id, array $data): bool
    {
        $service = $this->findById($id);

        if (!$service) {
            throw new \Exception('Service not found');
        }

        return $service->update($data);
    }

    /**
     * Delete a service.
     */
    public function delete(int $id): bool
    {
        $service = $this->findById($id);

        if (!$service) {
            throw new \Exception('Service not found');
        }

        return $service->delete();
    }

    /**
     * Bulk create services.
     */
    public function bulkCreate(array $services): array
    {
        $created = [];
        $errors = [];

        foreach ($services as $serviceData) {
            try {
                $created[] = $this->model->create($serviceData);
            } catch (\Exception $e) {
                $errors[] = [
                    'data' => $serviceData,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'success' => $created,
            'errors' => $errors,
        ];
    }

    /**
     * Get services by price range.
     */
    public function getByPriceRange(string $priceType, float $min, float $max): Collection
    {
        $validPriceTypes = ['cash_price', 'nhima_price', 'insurance_price', 'charity_price'];

        if (!in_array($priceType, $validPriceTypes)) {
            throw new \InvalidArgumentException('Invalid price type');
        }

        return $this->model->whereBetween($priceType, [$min, $max])
            ->orderBy($priceType)
            ->get();
    }

    /**
     * Search services by name.
     */
    public function search(string $searchTerm): Collection
    {
        return $this->model->where('service_name', 'like', '%' . $searchTerm . '%')
            ->orWhere('service_uuid', 'like', '%' . $searchTerm . '%')
            ->with('department')
            ->orderBy('service_name')
            ->get();
    }

    /**
     * Get service statistics.
     */
    public function getStatistics(): array
    {
        return [
            'total' => $this->model->count(),
            'by_department' => $this->model->selectRaw('department_id, count(*) as count')
                ->groupBy('department_id')
                ->with('department:id,name')
                ->get()
                ->map(function ($item) {
                    return [
                        'department_id' => $item->department_id,
                        'department_name' => $item->department->name ?? 'Unknown',
                        'count' => $item->count,
                    ];
                }),
            'price_summary' => [
                'cash' => $this->model->sum('cash_price'),
                'nhima' => $this->model->sum('nhima_price'),
                'insurance' => $this->model->sum('insurance_price'),
                'charity' => $this->model->sum('charity_price'),
            ],
        ];
    }

    /**
     * Get services with zero prices.
     */
    public function getZeroPricedServices(): Collection
    {
        return $this->model->where(function ($query) {
            $query->where('cash_price', '<=', 0)
                ->orWhere('nhima_price', '<=', 0)
                ->orWhere('insurance_price', '<=', 0)
                ->orWhere('charity_price', '<=', 0);
        })->get();
    }

    /**
     * Get count of services by department.
     */
    public function getCountByDepartment(int $departmentId): int
    {
        return $this->model->where('department_id', $departmentId)->count();
    }
}
