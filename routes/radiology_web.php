<?php

use App\Http\Controllers\Dashboards\RadiologyDashboardController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Radiologies\RadiologyController;
use App\Http\Controllers\Radiologies\RadiologyBulkStoreController;
use App\Http\Controllers\Reports\RadiologyReportController;

Route::prefix('radiology')->group(function () {
    Route::get('/queue/{departmentId}', [RadiologyController::class, 'queue']);
    Route::get('processed', [RadiologyController::class, 'processed']);
    Route::inertia('/reports/{departmentId}', 'radiologies/reports');
    Route::get('bulk-orders/{departmentId}', [RadiologyBulkStoreController::class, 'index']);
    Route::get('/dashboard/{deaprtementId}', [RadiologyDashboardController::class, 'index']);
});
