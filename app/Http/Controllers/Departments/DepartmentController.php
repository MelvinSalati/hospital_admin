<?php

namespace App\Http\Controllers\Departments;

use App\Http\Controllers\Controller;
use App\Models\Departments\Department;
use App\Models\Services\Service;
use App\Services\Departments\DepartmentService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    protected DepartmentService $departmentService;

    public function __construct(DepartmentService $departmentService)
    {
        $this->departmentService = $departmentService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $departments = Department::withCount('services')->get();
        $services = Service::all();

        return Inertia::render('departments/department', [
            'departments' => $departments ?? [],
            'services' => $services ?? []
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:departments,code',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $result = $this->departmentService->createDepartment($validated);

        if ($result['success']) {
            return response()->json($result, 201);
        }

        return response()->json($result, 422);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request)
    {
        $id = $request->get('id');

        if ($id) {
            $department = $this->departmentService->getDepartmentWithServices($id);

            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $department
            ]);
        }

        $filters = $request->only(['status', 'search']);
        $list = $this->departmentService->getDepartments($filters);

        return response()->json([
            'success' => true,
            'data' => $list,
            'users' => \App\Models\User::all()
        ]);
    }

   
    /**
     * Get active departments.
     */
    public function getActive()
    {
        $departments = $this->departmentService->getActiveDepartments();

        return response()->json([
            'success' => true,
            'data' => $departments
        ]);
    }

    /**
     * Get paginated departments.
     */
    public function getPaginated(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $filters = $request->only(['status', 'search']);

        $departments = $this->departmentService->getPaginatedDepartments($perPage, $filters);

        return response()->json([
            'success' => true,
            'data' => $departments
        ]);
    }

    /**
     * Get department statistics.
     */
    public function statistics()
    {
        $statistics = $this->departmentService->getDepartmentStatistics();

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }

    /**
     * Search departments.
     */
    public function search(Request $request)
    {
        $searchTerm = $request->get('q', '');
        $departments = $this->departmentService->searchDepartments($searchTerm);

        return response()->json([
            'success' => true,
            'data' => $departments
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $department = $this->departmentService->getDepartmentById($id);

        if (!$department) {
            return response()->json([
                'success' => false,
                'message' => 'Department not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $department
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50',
            'description' => 'nullable|string',
            'status' => 'sometimes|required|in:active,inactive',
        ]);

        $result = $this->departmentService->updateDepartment((int)$id, $validated);

        if ($result['success']) {
            return response()->json($result);
        }

        return response()->json($result, 422);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $result = $this->departmentService->deleteDepartment((int)$id);

        if ($result['success']) {
            return response()->json($result);
        }

        return response()->json($result, 422);
    }

    /**
     * Bulk update department status.
     */
    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|exists:departments,id',
            'status' => 'required|in:active,inactive',
        ]);

        $result = $this->departmentService->bulkUpdateStatus($validated['ids'], $validated['status']);

        if ($result['success']) {
            return response()->json($result);
        }

        return response()->json($result, 422);
    }
}
