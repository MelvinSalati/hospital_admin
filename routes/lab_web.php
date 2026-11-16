<?php


use App\Http\Controllers\Laboratories\LaboratoryBulkStoreController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Dashboards\LaboratoryDashboardController;


Route::prefix('/laboratory')->middleware(['auth', 'verified'])->group(function () {
    Route::get('bulk-orders/{departmentId}', [LaboratoryBulkStoreController::class, 'index']);
    Route::inertia('reports/{departmentId}', 'laboratories/reports');
    Route::get('dashboard/{deaprtementId}', [LaboratoryDashboardController::class, 'dashboard']);
});
