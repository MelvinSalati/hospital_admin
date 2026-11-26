<?php

use App\Http\Controllers\Dashboards\TheatreDashboardController;
use App\Http\Controllers\Theatre\TheaterController;
use App\Http\Controllers\Theatre\TheatreBulkStoreController;
use App\Http\Controllers\Reports\TheatreReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('theater')->group(function () {
    Route::get('/', [TheaterController::class, 'index']);

    Route::get('/dashboard/{departmentId}', [TheatreDashboardController::class, 'index']);

    Route::get('schedule/{departmentId}', [TheaterController::class, 'appointments']);
    Route::get('queue/{departmentId}', [TheaterController::class, 'queue']);
    Route::get('procedures', [TheaterController::class, 'procedures']);
    Route::get('processed', [TheaterController::class, 'processed']);

    Route::get('bulk-orders/{departmentId}', [TheaterController::class, 'bulkOrders']);

    Route::get('reports/{departmentId}', [TheatreReportController::class, 'index'])->name('theatre.reports');
});
