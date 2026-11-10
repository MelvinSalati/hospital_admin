<?php

namespace App\Services\Dashboard;

use App\Repositories\Dashboards\DashboardRepository;

class DashboardService
{
    protected DashboardRepository $dashboardRepository;

    /**
     * Create a new class instance.
     */
    public function __construct(
        DashboardRepository $dashboardRepository,
    ) {
        $this->dashboardRepository = $dashboardRepository;
    }

    /**
     * Build the dashboard payload for a department.
     *
     * @return array|\Illuminate\Http\JsonResponse
     */
    public function laboratory(int $departmentId)
    {
        return $this->dashboardRepository->create($departmentId);
    }

    public function radiology(int $departmentId)
    {
        return $this->dashboardRepository->create($departmentId);
    }

    public function pharmacy(int $departmentId)
    {
        return $this->dashboardRepository->create($departmentId);
    }

    public function maternalChildHealth(int $departmentId)
    {
        return $this->dashboardRepository->create($departmentId);
    }

    public function theatre(int $departmentId)
    {
        return $this->dashboardRepository->create($departmentId);
    }

    public function dental(int $departmentId)
    {
        return $this->dashboardRepository->create($departmentId);
    }

    public function ophthalmology(int $departmentId)
    {
        return $this->dashboardRepository->create($departmentId);
    }
}
