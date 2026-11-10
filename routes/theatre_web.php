<?php

use App\Http\Controllers\Dashboards\TheatreDashboardController;
use App\Http\Controllers\Theatre\TheatreController;
use App\Http\Controllers\Theatre\TheatreBulkStoreController;
use App\Http\Controllers\Reports\TheatreReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('theatre')->group(function () {
    Route::get('/', [TheatreController::class, 'index']);

    Route::get('/dashboard/{departmentId}', [TheatreDashboardController::class, 'index']);

    Route::get('schedule', [TheatreController::class, 'schedule']);
    Route::get('queue', [TheatreController::class, 'queue']);
    Route::get('procedures', [TheatreController::class, 'procedures']);
    Route::get('processed', [TheatreController::class, 'processed']);

    Route::get('bulk-orders/{departmentId}', [TheatreBulkStoreController::class, 'index']);

    Route::get('reports/{departmentId}', [TheatreReportController::class, 'index'])->name('theatre.reports');
});
