<?php

use App\Http\Controllers\Dashboards\OphthalmologyDashboardController;
use App\Http\Controllers\Ophthalmology\OphthalmologyController;
use App\Http\Controllers\Ophthalmology\OphthalmologyBulkStoreController;
use App\Http\Controllers\Reports\OphthalmologyReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('ophthalmology')->group(function () {
    Route::get('/', [OphthalmologyController::class, 'index']);

    Route::get('/dashboard/{departmentId}', [OphthalmologyDashboardController::class, 'index']);

    Route::get('appointments', [OphthalmologyController::class, 'appointments']);
    Route::get('queue', [OphthalmologyController::class, 'queue']);
    Route::get('examinations', [OphthalmologyController::class, 'examinations']);
    Route::get('procedures', [OphthalmologyController::class, 'procedures']);
    Route::get('processed', [OphthalmologyController::class, 'processed']);

    Route::get('bulk-orders/{departmentId}', [OphthalmologyBulkStoreController::class, 'index']);

    Route::get('reports/{departmentId}', [OphthalmologyReportController::class, 'index'])->name('ophthalmology.reports');
});
