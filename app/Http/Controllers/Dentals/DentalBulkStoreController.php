<?php

namespace App\Http\Controllers\Dentals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DentalBulkStoreController extends Controller
{
    public function index(Request $request, int $departmentId)
    {
        $departmentId = (int) $departmentId;

        return Inertia::render('dental/bulk-orders', [
            'departmentId' => $departmentId,
        ]);
    }
}
