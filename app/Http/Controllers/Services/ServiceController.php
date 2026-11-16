<?php

namespace App\Http\Controllers\Services;

use App\Http\Controllers\Controller;
use App\Services\Billables\Billable;
use Illuminate\Http\JsonResponse;
use App\Http\Requests\Services\ServiceFormRequest;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    /**
     * Initialize the controller.
     */
    public function __construct(
        protected Billable $billable
    ) {}

    /**
     * Display the services management page through Inertia.
     *
     * The React page retrieves its data separately through the API.
     */
    public function page(int $departmentId): Response
    {
        return Inertia::render('services/index', [
            'departmentId' => $departmentId,
        ]);
    }

    /**
     * Retrieve services belonging to a department.
     *
     * API endpoint.
     */
    public function index(int $departmentId): JsonResponse
    {
        $services = $this->billable->getServices($departmentId);

        return response()->json([
            'success' => true,
            'data' => $services,
        ]);
    }


    /**
     * Create specialised services for a specific user.
     *
     * Registers both Cash and Insurance scheme services.
     */
    public function create(ServiceFormRequest $request, int $userId): JsonResponse
    {
        $data = $request->validated();
        $serviceName = User::where('id', $userId)->value('name');
        $cashPrice   = $request->cash_price;
        $insurancePrice = $request->insurance_price;
        $cashService = $this->billable->create([
            'scheme_type'   => '1',
            'user_id'       => $userId,
            'service_category' => 'Consultation',
            'service_name'  => "Consultation by " . $serviceName,
            'price'         => $cashPrice,
            'is_active'     => $data['is_active'] ?? true,
            'description'   => $data['notes'] ?? "Specialist's consultation ",
            'department_id' => 3
        ]);

        $insuranceService = $this->billable->create([
            'scheme_type'   => '2',
            'user_id'       => $userId,
            'service_category' => 'Consultation',
            'service_name'  => "Consultation by " . $serviceName,
            'price'         => $insurancePrice,
            'is_active'     => $data['is_active'] ?? true,
            'description'   => $data['notes'] ?? "Specialist's consultation ",
            'department_id' => 3
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Specialised services created successfully.',
            'data' => [
                'cash' => $cashService,
                'insurance' => $insuranceService,
            ],
        ], 201);
    }

    /**
     * Register a new billable service.
     */
    public function store(ServiceFormRequest $request): JsonResponse
    {
        $service = $this->billable->create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Service created successfully.',
            'data' => $service,
        ], 201);
    }

    /**
     * Update an existing billable service.
     */
    public function update(
        ServiceFormRequest $request,
        int $serviceId
    ): JsonResponse {
        $updated = $this->billable->updateService(
            $request->validated(),
            $serviceId
        );

        return response()->json([
            'success' => $updated,
            'message' => $updated
                ? 'Service updated successfully.'
                : 'No changes were made.',
        ]);
    }
}
