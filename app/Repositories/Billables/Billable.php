<?php

namespace App\Repositories\Billables;

use App\Models\Services\Service;

/**
 * Class Billable
 *
 * Repository responsible for managing billable services within the
 * altaf hospital management system.
 *
 * Provides methods for creating, updating, and retrieving services
 * associated with specific departments.
 *
 * @package App\Repositories\Billables
 */
class Billable
{
    /**
     * Create a new billable service.
     *
     * Persists the supplied service details in the services table.
     *
     * @param array $data Associative array containing service attributes.
     * @return Service The newly created service instance.
     */
    public function create(array $data): Service
    {
        return Service::create($data);
    }

    /**
     * Update an existing billable service.
     *
     * Retrieves the service using its primary key and updates its
     * attributes with the supplied service details.
     *
     * @param array $serviceDetails Associative array of attributes to update.
     * @param int $serviceId The ID of the service to update.
     * @return bool True if the service was successfully updated.
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     *         If the service does not exist.
     */
    public function updateService(array $serviceDetails, int $serviceId): bool
    {
        $service = Service::findOrFail($serviceId);

        return $service->update($serviceDetails);
    }

    /**
     * Retrieve all billable services belonging to a department.
     *
     * Filters services using the department ID, ensuring that each
     * department can retrieve its own registered billable services.
     *
     * @param int $departmentId The ID of the department.
     * @return \Illuminate\Database\Eloquent\Collection<int, Service>
     */
    public function getServices(int $departmentId)
    {
        return Service::where('department_id', $departmentId)->get();
    }
}
