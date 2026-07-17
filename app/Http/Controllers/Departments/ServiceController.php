<?php

namespace App\Http\Controllers\Departments;

use App\Services\HospitalServices\HospitalService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller; 
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ServiceController extends Controller
{
    protected HospitalService $hospitalService;

    public function __construct(HospitalService $hospitalService)
    {
        $this->hospitalService = $hospitalService;
    }

    /**
     * Display a listing of services.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['department_id', 'search', 'has_price']);
        $services = $this->hospitalService->getAllServices($filters);

        return response()->json([
            'success' => true,
            'data' => $services,
            'message' => 'Services retrieved successfully'
        ]);
    }

    /**
     * Get paginated services.
     */
    public function paginated(Request $request): JsonResponse
    {
        $perPage = $request->get('per_page', 15);
        $filters = $request->only(['department_id', 'search']);
        $services = $this->hospitalService->getPaginatedServices($perPage, $filters);

        return response()->json([
            'success' => true,
            'data' => $services,
            'message' => 'Services retrieved successfully'
        ]);
    }

    /**
     * Store a newly created service.
     */
    public function store(Request $request): JsonResponse
    {
        // Log the incoming request data for debugging
        Log::info('Service creation request', $request->all());

        // Prepare the data for validation
        $data = $request->all();

        // Only add service_uuid if it's not provided in the request
        if (!isset($data['service_uuid']) || empty($data['service_uuid'])) {
            $data['service_uuid'] = Str::uuid();
        }

        // Validate the request
        $validated = Validator::make($data, [
            'service_name' => 'required|string|max:255',
            'department_id' => 'required|exists:departments,id',
            'cash_price' => 'nullable|numeric|min:0',
            'nhima_price' => 'nullable|numeric|min:0',
            'insurance_price' => 'nullable|numeric|min:0',
            'charity_price' => 'nullable|numeric|min:0',
            'provider_id' => 'nullable|integer|exists:providers,id',
            'service_category' => 'nullable|integer',
        ]);

        if ($validated->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validated->errors()
            ], 422);
        }

        $validatedData = $validated->validated();

        // Log the service category if provided
        if (isset($validatedData['service_category'])) {

            $categoryMap = [
                1 => 'Laboratory',
                2 => 'Procedures',
                3 => 'Drugs',
                4 => 'Imaging',
                5 => 'Others',
            ];

            $categoryValue = (int) $validatedData['service_category'];

            $categoryLabel = $categoryMap[$categoryValue] ?? 'Unknown';

            // Merge back into validated data
            $validatedData = array_merge($validatedData, [
                'service_category' => $categoryLabel
            ]);

            Log::info('Service category provided', [
                'service_category' => $categoryValue,
                'label' => $categoryLabel
            ]);
}

        try {
            $service = $this->hospitalService->createService($validatedData);

            return response()->json([
                'success' => true,
                'data' => $service,
                'message' => 'Service created successfully'
            ], 201);
        } catch (\Exception $e) {
            Log::error('Service creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create service',
                'errors' => ['general' => $e->getMessage()]
            ], 422);
        }
    }
    /**
     * Display the specified service.
     */
    public function show(int $id): JsonResponse
    {
        $service = $this->hospitalService->getServiceDetails($id);

        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Service not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $service,
            'message' => 'Service retrieved successfully'
        ]);
    }

    /**
     * Update the specified service.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'service_name' => 'sometimes|required|string|max:255',
            'department_id' => 'sometimes|required|exists:departments,id',
            'cash_price' => 'nullable|numeric|min:0',
            'nhima_price' => 'nullable|numeric|min:0',
            'insurance_price' => 'nullable|numeric|min:0',
            'charity_price' => 'nullable|numeric|min:0',
            'service_uuid' => 'nullable|integer',
            'provider_id' => 'nullable|integer',
        ]);

        try {
            $service = $this->hospitalService->updateService($id, $validated);

            return response()->json([
                'success' => true,
                'data' => $service,
                'message' => 'Service updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Remove the specified service.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->hospitalService->deleteService($id);

            return response()->json([
                'success' => true,
                'message' => 'Service deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Get services by department.
     */
    public function getByDepartment(int $departmentId): JsonResponse
    {
        $services = $this->hospitalService->getServicesByDepartment($departmentId);

        return response()->json([
            'success' => true,
            'data' => $services,
            'message' => 'Services retrieved successfully'
        ]);
    }

    /**
     * Search services.
     */
    public function search(Request $request): JsonResponse
    {
        $searchTerm = $request->get('q', '');
        $services = $this->hospitalService->searchServices($searchTerm);

        return response()->json([
            'success' => true,
            'data' => $services,
            'message' => 'Search completed successfully'
        ]);
    }

    /**
     * Get service price by payment type.
     */
    public function getPrice(int $serviceId, string $paymentType): JsonResponse
    {
        try {
            $price = $this->hospitalService->getServicePrice($serviceId, $paymentType);

            if ($price === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'service_id' => $serviceId,
                    'payment_type' => $paymentType,
                    'price' => $price
                ],
                'message' => 'Price retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Get service statistics.
     */
    public function statistics(): JsonResponse
    {
        $statistics = $this->hospitalService->getServiceStatistics();

        return response()->json([
            'success' => true,
            'data' => $statistics,
            'message' => 'Statistics retrieved successfully'
        ]);
    }

    /**
     * Bulk update service prices.
     */
    public function bulkUpdatePrices(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'updates' => 'required|array',
            'updates.*.id' => 'required|exists:services,id',
            'updates.*.cash_price' => 'nullable|numeric|min:0',
            'updates.*.nhima_price' => 'nullable|numeric|min:0',
            'updates.*.insurance_price' => 'nullable|numeric|min:0',
            'updates.*.charity_price' => 'nullable|numeric|min:0',
        ]);

        try {
            $results = $this->hospitalService->bulkUpdatePrices($validated['updates']);

            return response()->json([
                'success' => true,
                'data' => $results,
                'message' => 'Bulk price update completed'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get zero-priced services.
     */
    public function zeroPriced(): JsonResponse
    {
        $services = $this->hospitalService->getZeroPricedServices();

        return response()->json([
            'success' => true,
            'data' => $services,
            'message' => 'Zero-priced services retrieved successfully'
        ]);
    }
}
