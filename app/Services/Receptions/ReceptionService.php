<?php

namespace App\Services\Receptions;

use App\Repositories\Receptions\ReceptionRepository;

class ReceptionService
{
    public function __construct(
        private readonly ReceptionRepository $repository
    ) {}

    /**
     * Props for the receptions/dashboard Inertia page.
     */
    public function dashboard(int $departmentId): array
    {
        return [
            'stats'           => $this->repository->mapDashboardMetrics(),
            'visits'          => $this->repository->getActiveQueue(),
            'alerts'          => $this->repository->receptionAlerts($departmentId),
            'serviceData'     => $this->repository->serviceData(),
            'attendanceTrend' => $this->repository->attendanceTrend(),
            'paymentStats'    => $this->repository->paymentStats(),
            'patientFlow'     => $this->repository->patientFlow(),
        ];
    }
}
