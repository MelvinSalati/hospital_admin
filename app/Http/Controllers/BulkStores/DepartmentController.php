<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStores\StoreDepartmentRequest;
use App\Http\Requests\BulkStores\UpdateDepartmentRequest;
use App\Models\BulkStores\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    // GET /departments
    public function index(Request $request): JsonResponse
    {
        $departments = Department::query()
            ->when($request->boolean('active_only'), fn ($q) => $q->active())
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($departments);
    }

    // POST /departments
    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $department = Department::create($request->validated());

        return response()->json($department, 201);
    }

    // GET /departments/{department}
    public function show(Department $department): JsonResponse
    {
        return response()->json($department);
    }

    // PUT /departments/{department}
    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $department->update($request->validated());

        return response()->json($department);
    }

    // DELETE /departments/{department}
    public function destroy(Department $department): JsonResponse
    {
        $department->delete();

        return response()->json(['message' => 'Department deleted.']);
    }
}
