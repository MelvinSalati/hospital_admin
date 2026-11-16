<?php

use App\Http\Controllers\Dashboards\TheatreDashboardController;
use App\Http\Controllers\Theatre\TheatreController;
use App\Http\Controllers\Theatre\TheatreBulkStoreController;
use App\Http\Controllers\Reports\TheatreReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('theatre')->group(function () {
    Route::get('/', [TheatreController::class, 'index']);

    Route::get('/dashboard/{departmentId}', [TheatreDashboardController::class, 'index']);

    Route::get('schedule/{departmentId}', [TheatreController::class, 'appointments']);
    Route::get('queue/{departmentId}', [TheatreController::class, 'queue']);
    Route::get('procedures', [TheatreController::class, 'procedures']);
    Route::get('processed', [TheatreController::class, 'processed']);

    Route::get('bulk-orders/{departmentId}', [TheatreController::class, 'bulkOrders']);

    Route::get('reports/{departmentId}', [TheatreReportController::class, 'index'])->name('theatre.reports');
});
