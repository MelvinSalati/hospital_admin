<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Patients\DispensingController;

// Web routes (for Inertia)
Route::prefix('patients/{patientId}')->group(function () {
    Route::get('dispensing', [DispensingController::class, 'index'])->name('patients.dispensing');
});

// API routes (for AJAX calls)
Route::prefix('api/v1')->group(function () {
    Route::post('patients/dispense/{prescriptionNumber}', [DispensingController::class, 'dispense']);
    Route::get('patients/{patientId}/dispense/{prescriptionNumber}/history', [DispensingController::class, 'getDispensationHistory']);
    Route::get('patients/{patientId}/dispense/{prescriptionNumber}/items', [DispensingController::class, 'getDispensedItems']);
});