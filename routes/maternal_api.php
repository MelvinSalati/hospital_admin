<?php

use App\Http\Controllers\MaternalChildHealth\MaternalChildHealthController;
use App\Http\Controllers\MaternalChildHealth\MaternalChildHealthBulkStoreController;
use App\Http\Controllers\Reports\MaternalChildHealthReportController;
use Illuminate\Support\Facades\Route;

// Route::middleware('auth:sanctum')->prefix('maternal-child-health')->group(function () {
//     Route::get('appointments', [MaternalChildHealthController::class, 'appointments']);
//     Route::get('queue', [MaternalChildHealthController::class, 'queue']);
//     Route::get('maternal-care', [MaternalChildHealthController::class, 'maternalCare']);
//     Route::get('child-health', [MaternalChildHealthController::class, 'childHealth']);
//     Route::get('processed', [MaternalChildHealthController::class, 'processed']);

//     Route::get('bulk-orders/{departmentId}', [MaternalChildHealthBulkStoreController::class, 'index']);
//     Route::get('reports/{departmentId}', [MaternalChildHealthReportController::class, 'index']);
// });
