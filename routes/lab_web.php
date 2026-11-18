<?php


use App\Http\Controllers\Laboratories\LaboratoryBulkStoreController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Dashboards\LaboratoryDashboardController;

use App\Http\Controllers\Laboratories\LaboratoryController;

Route::prefix('/laboratory')->middleware(['auth', 'verified'])->group(function () {
    // Route::get('/queue/{departmentId}',[LaboratoryController::class]);
    Route::get('bulk-orders/{departmentId}', [LaboratoryBulkStoreController::class, 'index']);
    Route::inertia('reports/{departmentId}', 'laboratories/reports');
    Route::get('dashboard/{deaprtementId}', [LaboratoryDashboardController::class, 'dashboard']);
});


Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('/laboratory')->group(function () {
        Route::get('/queue/{departmentId}', [LaboratoryController::class, 'laboratoryQueue']);
        Route::get('/dashboard/{departmentId}', [LaboratoryController::class, 'dashboard']);
        Route::get('/processed/{departmentId}', [LaboratoryController::class, 'processed']);
        Route::get('/logistics/{departmentId}', [LaboratoryController::class, 'logistics']);
        Route::get('/orders/{departmentId}', [LaboratoryController::class, 'orders']);
        Route::get('/reports/{departmentId}', [LaboratoryController::class, 'reports']);
        Route::get('/manage-tests/{departmentId}', [LaboratoryController::class, 'settings']);
        Route::get('/bulk-store/{departmentId}', [LaboratoryBulkStoreController::class, 'index']);
    });

    Route::prefix("user")->group(function () {
        Route::get('/create', function () {
            return Inertia::render('users/register', [
                'departments' => \App\Models\Department::all()
            ]);
        });
    });



    /**
     *  Users managemert routes
     */

    Route::prefix('admin')->group(function () {
        Route::get('/users', [AdminController::class, 'create']);
        Route::get('/users/list', [AdminController::class, 'index']);
    });

    Route::prefix('users')->group(function () {
        Route::get('/manage-account', [UserController::class, 'index']);
    });
});
