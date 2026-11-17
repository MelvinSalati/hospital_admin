<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserDepartment
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $assignedDepartmentId = $user?->profile?->department_id;

        // Every departmental user must have an assigned department.
        abort_if(
            !$assignedDepartmentId,
            403,
            'You are not assigned to a department.'
        );

        // Validate an explicitly requested department.
        $requestedDepartmentId = $request->route('departmentId');

        if ($requestedDepartmentId !== null) {
            abort_if(
                (int) $requestedDepartmentId !== (int) $assignedDepartmentId,
                403,
                'You cannot access another department.'
            );
        }

        // Make the authenticated user's department available downstream.
        $request->attributes->set(
            'department_id',
            (int) $assignedDepartmentId
        );

        return $next($request);
    }
}
