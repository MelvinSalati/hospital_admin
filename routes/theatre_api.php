<?php

use App\Http\Controllers\Patients\TheaterController;
use App\Http\Controllers\Theatre\TheatreBulkStoreController;
use App\Http\Controllers\Reports\TheatreReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/theater')->group(function () {
    Route::get('schedule',   [TheaterController::class, 'schedule']);
    Route::get('queue',      [TheaterController::class, 'queue']);
    Route::get('procedures', [TheaterController::class, 'procedures']);
    Route::get('processed',  [TheaterController::class, 'processed']);
    Route::post('/op-notes', [TheaterController::class, 'storeOperativeNote']);
    Route::get('bulk-orders/{departmentId}', [TheatreBulkStoreController::class, 'index']);
    Route::get('reports/{departmentId}',     [TheatreReportController::class, 'index']);
});
