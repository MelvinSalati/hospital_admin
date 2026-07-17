<?php

use App\Http\Controllers\Patients\LabOrderController;
use App\Http\Controllers\Laboratories\LaboratoryController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Laboratory Orders Routes
    Route::post('{patientId}/lab-orders', [LabOrderController::class, 'store']);
    Route::prefix('patients/{patientId}')->group(function () {
        // Get all lab orders for a patient
        Route::get('/lab-orders', [LabOrderController::class, 'index']);

        // Create a new lab order - REMOVED duplicate {patientId}
        Route::post('/lab-orders', [LabOrderController::class, 'store']);
    });

    // Lab order specific routes
    Route::prefix('lab-orders')->group(function () {
        // Get a specific order
        Route::get('/{id}', [LabOrderController::class, 'show']);

        // Update order status
        Route::put('/{id}/status', [LabOrderController::class, 'updateStatus']);

        // Get order results
        Route::get('/{orderId}/results', [LabOrderController::class, 'getResults']);

        // Update individual test item status
        Route::put('/{orderId}/items/{itemId}/status', [LabOrderController::class, 'updateItemStatus']);
    });

    // Results
    Route::post('/results/{sampleId}', [LaboratoryController::class, 'enterResults']);

    // Available tests route
    Route::get('/laboratory-tests/available', [LabOrderController::class, 'getAvailableTests']);
});
