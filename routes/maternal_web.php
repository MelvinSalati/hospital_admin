<?php

use App\Http\Controllers\Dashboards\MaternalChildHealthDashboardController;
use App\Http\Controllers\MaternalChildHealth\MaternalChildHealthController;
use App\Http\Controllers\MaternalChildHealth\MaternalChildHealthBulkStoreController;
use App\Http\Controllers\Reports\MaternalChildHealthReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('maternal-child-health')->group(function () {
    Route::get('/', [MaternalChildHealthController::class, 'index']);

    // dashboard (needs department id)
    Route::get('/dashboard/{departmentId}', [MaternalChildHealthDashboardController::class, 'index']);

    // clinical queues
    Route::get('appointments', [MaternalChildHealthController::class, 'appointments']);
    Route::get('queue', [MaternalChildHealthController::class, 'queue']);
    Route::get('maternal-care', [MaternalChildHealthController::class, 'maternalCare']);
    Route::get('child-health', [MaternalChildHealthController::class, 'childHealth']);
    Route::get('processed', [MaternalChildHealthController::class, 'processed']);

    // bulk store orders (needs department id)
    Route::get('bulk-orders/{departmentId}', [MaternalChildHealthBulkStoreController::class, 'index']);

    // reports (needs department id)
    Route::get('reports/{departmentId}', [MaternalChildHealthReportController::class, 'index'])->name('maternal.reports');
});
