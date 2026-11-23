<?php

use App\Http\Controllers\Dashboards\OpthamologyDashboardController;
use App\Http\Controllers\Opthamology\OpthamologyController;
use App\Http\Controllers\Reports\OpthamologyReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('opthamology')->group(function () {
    Route::get('/', [OpthamologyController::class, 'index']);

    Route::get('/dashboard/{departmentId}', [OpthamologyDashboardController::class, 'index']);

    Route::get('appointments', [OpthamologyController::class, 'appointments']);
    Route::get('queue', [OpthamologyController::class, 'queue']);
    Route::get('examinations', [OpthamologyController::class, 'examinations']);
    Route::get('procedures', [OpthamologyController::class, 'procedures']);
    Route::get('processed', [OpthamologyController::class, 'processed']);

    Route::get('bulk-orders/{departmentId}', [OpthamologyBulkStoreController::class, 'index']);

    Route::get('reports/{departmentId}', [OpthamologyReportController::class, 'index'])->name('opthalmology.reports');
});


Route::prefix('opthalmology')
    ->name('opthalmology.')
    ->middleware(['auth'])
    ->group(function () {
        Route::get('/dashboard/{departmentId}', [
            OpthamologyController::class,
            'dashboard',
        ])->name('dashboard');

        Route::get('/appointments/{departmentId}', [
            OpthamologyController::class,
            'appointments',
        ])->name('appointments');

        Route::get('/queue/{departmentId}', [
            OpthamologyController::class,
            'queue',
        ])->name('queue');

        Route::get('/examinations/{departmentId}', [
            OpthamologyController::class,
            'examinations',
        ])->name('examinations');

        Route::get('/procedures/{departmentId}', [
            OpthalmologyController::class,
            'procedures',
        ])->name('procedures');

        Route::get('/processed/{departmentId}', [
            OpthamologyController::class,
            'processed',
        ])->name('processed');

        Route::get('/bulk-orders/{departmentId}', [
            OpthamologyController::class,
            'bulkOrders',
        ])->name('bulk-orders');

        Route::get('/reports/{departmentId}', [
            OpthamologyController::class,
            'reports',
        ])->name('reports');
    });
