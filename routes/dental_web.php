<?php

use App\Http\Controllers\Dashboards\DentalDashboardController;
use App\Http\Controllers\Dentals\DentalController;
use App\Http\Controllers\Dentals\DentalBulkStoreController;
use App\Http\Controllers\Reports\DentalReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('dental')->group(function () {
    // Optional: keep a catch-all if you still need it
    Route::get('/', [DentalController::class, 'index']);

    // Dashboard
    Route::get('/dashboard/{departmentId?}', [DentalController::class, 'dashboard'])
        ->name('dental.dashboard');

    // Core clinical routes – now accept optional departmentId
    Route::get('appointments/{departmentId?}', [DentalController::class, 'appointments'])
        ->name('dental.appointments');

    Route::get('queue/{departmentId?}', [DentalController::class, 'queue'])
        ->name('dental.queue');

    Route::get('billables/{departmentId?}', [DentalController::class, 'procedures'])
        ->name('dental.procedures');

    Route::get('processed/{departmentId?}', [DentalController::class, 'processed'])
        ->name('dental.processed');

    // Bulk store & reports
    Route::get('bulk-orders/{departmentId?}', [DentalController::class, 'bulkOrders'])
        ->name('dental.bulk-orders');

    Route::get('reports/{departmentId?}', [DentalReportController::class, 'index'])
        ->name('dental.reports');
});
