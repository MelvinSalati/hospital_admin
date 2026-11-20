<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(
        Request $request,
        string $department,
        int $departmentId
    ) {
        $user = $request->user();

        $userDepartment = DB::table('user_profiles')
            ->where('user_id', $user->id)
            ->value('department_id');

        // Prevent users from accessing another department's dashboard.
        abort_unless(
            (int) $userDepartment === $departmentId,
            403,
            'You are not authorised to access this department.'
        );

        $departmentRecord = DB::table('departments')
            ->where('id', $departmentId)
            ->first();

        abort_unless($departmentRecord, 404);

        return Inertia::render('Dashboard/Index', [
            'departmentId' => $departmentRecord->id,
            'department' => $departmentRecord->name,
        ]);
    }
}
