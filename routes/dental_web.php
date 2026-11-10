<?php

use App\Http\Controllers\Dashboards\DentalDashboardController;
use App\Http\Controllers\Dentals\DentalController;
use App\Http\Controllers\Dentals\DentalBulkStoreController;
use App\Http\Controllers\Reports\DentalReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('dental')->group(function () {
    Route::get('/', [DentalController::class, 'index']);

    Route::get('/dashboard/{departmentId}', [DentalDashboardController::class, 'index']);

    Route::get('appointments', [DentalController::class, 'appointments']);
    Route::get('queue',        [DentalController::class, 'queue']);
    Route::get('procedures',   [DentalController::class, 'procedures']);
    Route::get('processed',    [DentalController::class, 'processed']);

    Route::get('bulk-orders/{departmentId}', [DentalBulkStoreController::class, 'index']);
    Route::get('reports/{departmentId}',     [DentalReportController::class, 'index'])->name('dental.reports');
});
