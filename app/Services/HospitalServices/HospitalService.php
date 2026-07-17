<?php

namespace App\Services\HospitalServices;

use App\Models\Departments\Department;
use App\Models\Service;
use App\Repositories\Services\ServiceRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class HospitalService
{
    protected ServiceRepository $serviceRepository;

    /**
     * Create a new class instance.
     */
    public function __construct(ServiceRepository $serviceRepository)
    {
        $this->serviceRepository = $serviceRepository;
    }

    /**
     * Get all departments with their service counts.
     */
    public function getAllDepartments(): Collection
    {
        return Department::withCount('services')
            ->orderBy('name')
            ->get();
    }

    /**
     * Get active departments only.
     */
    public function getActiveDepartments(): Collection
    {
        return Department::where('status', 'active')
            ->withCount('services')
            ->orderBy('name')
            ->get();
    }

    /**
     * Get department with its services.
     */
    public function getDepartmentWithServices(int $departmentId): ?Department
    {
        return Department::with(['services' => function ($query) {
            $query->orderBy('service_name');
        }])->find($departmentId);
    }

    /**
     * Create a new department.
     */
    public function createDepartment(array $data): Department
    {
        try {
            DB::beginTransaction();

            $department = Department::create([
                'name' => $data['name'],
                'code' => strtoupper($data['code']),
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? 'active',
            ]);

            DB::commit();

            Log::info('Department created successfully', [
                'department_id' => $department->id,
                'department_code' => $department->code,
                'user_id' => auth()->id()
            ]);

            return $department;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create department', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw $e;
        }
    }

    /**
     * Update an existing department.
     */
    public function updateDepartment(int $departmentId, array $data): Department
    {
        try {
            DB::beginTransaction();

            $department = Department::findOrFail($departmentId);

            $department->update([
                'name' => $data['name'] ?? $department->name,
                'code' => isset($data['code']) ? strtoupper($data['code']) : $department->code,
                'description' => $data['description'] ?? $department->description,
                'status' => $data['status'] ?? $department->status,
            ]);

            DB::commit();

            Log::info('Department updated successfully', [
                'department_id' => $department->id,
                'changes' => array_keys($data),
                'user_id' => auth()->id()
            ]);

            return $department;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update department', [
                'department_id' => $departmentId,
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw $e;
        }
    }

    /**
     * Delete a department and its services.
     */
    public function deleteDepartment(int $departmentId): bool
    {
        try {
            DB::beginTransaction();

            $department = Department::findOrFail($departmentId);

            // Check if department has services
            $serviceCount = $department->services()->count();

            if ($serviceCount > 0) {
                throw new \Exception("Cannot delete department with {$serviceCount} associated services. Please delete or move services first.");
            }

            $department->delete();

            DB::commit();

            Log::info('Department deleted successfully', [
                'department_id' => $departmentId,
                'department_name' => $department->name,
                'user_id' => auth()->id()
            ]);

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete department', [
                'department_id' => $departmentId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get all services with optional filtering.
     */
    public function getAllServices(array $filters = []): Collection
    {
        return $this->serviceRepository->getAll($filters);
    }

    /**
     * Get paginated services.
     */
    public function getPaginatedServices(int $perPage = 15, array $filters = [])
    {
        return $this->serviceRepository->getPaginated($perPage, $filters);
    }

    /**
     * Get services by department.
     */
    public function getServicesByDepartment(int $departmentId): Collection
    {
        return $this->serviceRepository->getByDepartment($departmentId);
    }

    /**
     * Get service details.
     */
    public function getServiceDetails(int $serviceId): ?Service
    {
        return $this->serviceRepository->findById($serviceId);
    }

    /**
     * Create a new service.
     */
    public function createService(array $data){
        try {
            DB::beginTransaction();

            // Validate department exists
            Department::findOrFail($data['department_id']);

            // Validate at least one price is set
            $this->validateServicePrices($data);

            $service = $this->serviceRepository->create([
                'service_name' => $data['service_name'],
                'department_id' => $data['department_id'],
                'cash_price' => $data['cash_price'] ?? null,
                'nhima_price' => $data['nhima_price'] ?? null,
                'insurance_price' => $data['insurance_price'] ?? null,
                'service_category' => $data['service_category']?? null,
                'charity_price' => $data['charity_price'] ?? null,
                'service_uuid' => Str::uuid(),
                'service_code' => rand(000000,999999),
                'provider_id' => $data['provider_id'] ?? null,
            ]);

            DB::commit();

            Log::info('Service created successfully', [
                'service_id' => $service->id,
                'service_name' => $service->service_name,
                'department_id' => $data['department_id'],
                'user_id' => auth()->id()
            ]);

            return $service->load('department');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create service', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw $e;
        }
    }

    /**
     * Update an existing service.
     */
    public function updateService(int $serviceId, array $data): Service
    {
        try {
            DB::beginTransaction();

            // Validate at least one price is set if prices are being updated
            if (
                isset($data['cash_price']) || isset($data['nhima_price']) ||
                isset($data['insurance_price']) || isset($data['charity_price'])
            ) {
                $this->validateServicePrices($data);
            }

            $this->serviceRepository->update($serviceId, $data);

            DB::commit();

            $service = $this->serviceRepository->findById($serviceId);

            Log::info('Service updated successfully', [
                'service_id' => $serviceId,
                'changes' => array_keys($data),
                'user_id' => auth()->id()
            ]);

            return $service;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update service', [
                'service_id' => $serviceId,
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw $e;
        }
    }

    /**
     * Delete a service.
     */
    public function deleteService(int $serviceId): bool
    {
        try {
            DB::beginTransaction();

            $result = $this->serviceRepository->delete($serviceId);

            DB::commit();

            Log::info('Service deleted successfully', [
                'service_id' => $serviceId,
                'user_id' => auth()->id()
            ]);

            return $result;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete service', [
                'service_id' => $serviceId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get price for service based on payment type.
     */
    public function getServicePrice(int $serviceId, string $paymentType): ?float
    {
        $service = $this->serviceRepository->findById($serviceId);

        if (!$service) {
            return null;
        }

        $priceField = $paymentType . '_price';

        if (!in_array($priceField, ['cash_price', 'nhima_price', 'insurance_price', 'charity_price'])) {
            throw new \InvalidArgumentException('Invalid payment type');
        }

        return $service->$priceField;
    }

    /**
     * Search services.
     */
    public function searchServices(string $searchTerm): Collection
    {
        return $this->serviceRepository->search($searchTerm);
    }

    /**
     * Get service statistics.
     */
    public function getServiceStatistics(): array
    {
        return $this->serviceRepository->getStatistics();
    }

    /**
     * Get services by price range.
     */
    public function getServicesByPriceRange(string $priceType, float $min, float $max): Collection
    {
        return $this->serviceRepository->getByPriceRange($priceType, $min, $max);
    }

    /**
     * Bulk update service prices.
     */
    public function bulkUpdatePrices(array $updates): array
    {
        $results = [
            'success' => [],
            'errors' => []
        ];

        try {
            DB::beginTransaction();

            foreach ($updates as $update) {
                try {
                    $service = $this->serviceRepository->findById($update['id']);

                    if (!$service) {
                        $results['errors'][] = [
                            'id' => $update['id'],
                            'error' => 'Service not found'
                        ];
                        continue;
                    }

                    $this->serviceRepository->update($update['id'], [
                        'cash_price' => $update['cash_price'] ?? $service->cash_price,
                        'nhima_price' => $update['nhima_price'] ?? $service->nhima_price,
                        'insurance_price' => $update['insurance_price'] ?? $service->insurance_price,
                        'charity_price' => $update['charity_price'] ?? $service->charity_price,
                    ]);

                    $results['success'][] = $this->serviceRepository->findById($update['id']);
                } catch (\Exception $e) {
                    $results['errors'][] = [
                        'id' => $update['id'],
                        'error' => $e->getMessage()
                    ];
                }
            }

            DB::commit();

            Log::info('Bulk price update completed', [
                'success_count' => count($results['success']),
                'error_count' => count($results['errors']),
                'user_id' => auth()->id()
            ]);

            return $results;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to bulk update prices', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Validate that at least one price is provided.
     */
    protected function validateServicePrices(array $data): void
    {
        $hasPrice = false;
        $priceFields = ['cash_price', 'nhima_price', 'insurance_price', 'charity_price'];

        foreach ($priceFields as $field) {
            if (isset($data[$field]) && $data[$field] > 0) {
                $hasPrice = true;
                break;
            }
        }

        if (!$hasPrice) {
            throw new \InvalidArgumentException('At least one price category must be provided');
        }
    }

    /**
     * Get zero-priced services.
     */
    public function getZeroPricedServices(): Collection
    {
        return $this->serviceRepository->getZeroPricedServices();
    }

    /**
     * Get department service count.
     */
    public function getDepartmentServiceCount(int $departmentId): int
    {
        return $this->serviceRepository->getCountByDepartment($departmentId);
    }
}
