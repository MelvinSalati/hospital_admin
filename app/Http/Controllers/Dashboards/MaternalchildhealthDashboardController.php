<?php

namespace App\Http\Controllers\Dashboards;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\DashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MaternalchildhealthDashboardController extends Controller
{
    protected DashboardService $dashboard;

    public function __construct(DashboardService $dashboard)
    {
        $this->dashboard = $dashboard;
    }

    public function index(Request $request, int $departmentId)
    {
        $departmentId = (int) $departmentId;

        // Optional: guard against users hitting another department's dashboard.
        // Uncomment once you have a policy or role check in place.
        // $this->authorize('viewMaternalChildHealthDashboard', $departmentId);

        $data = $this->dashboard->maternalChildHealth($departmentId);

        // Handle the case where the service returns a JsonResponse
        // (as your repository currently does) — unwrap it.
        if ($data instanceof \Illuminate\Http\JsonResponse) {
            $data = $data->getData(true);
        }

        return Inertia::render('maternal-child-health/dashboard', array_merge(
            [
                'userName' => $request->user()?->name ?? 'Maternal Child Health User',
            ],
            $data,
        ));
    }
}
