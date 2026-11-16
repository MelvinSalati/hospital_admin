<?php

use App\Http\Controllers\Patients\TheaterController;
use App\Http\Controllers\Theatre\TheatreBulkStoreController;
use App\Http\Controllers\Reports\TheatreReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/theater')->group(function () {
    Route::get('schedule',   [TheatreController::class, 'schedule']);
    Route::get('queue',      [TheatreController::class, 'queue']);
    Route::get('procedures', [TheatreController::class, 'procedures']);
    Route::get('processed',  [TheatreController::class, 'processed']);
    Route::post('/op-notes', [TheaterController::class, 'storeOperativeNote']);
    Route::get('bulk-orders/{departmentId}', [TheatreBulkStoreController::class, 'index']);
    Route::get('reports/{departmentId}',     [TheatreReportController::class, 'index']);
});
