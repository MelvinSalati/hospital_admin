<?php


use App\Http\Controllers\Patients\DrugAdministrationController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Pharmacies\PharmacyController; 

// Drug Administration Routes
Route::prefix('v1')->group(function () {
    Route::prefix('patients')->group(function () {
        // Get all administrations for a patient
        Route::get('{patientId}/drug-administrations', [DrugAdministrationController::class, 'index']);
        Route::post('{patientId}/drug-administrations', [DrugAdministrationController::class, 'store']);

        // Get administration history for a specific drug
        Route::get('{patientId}/drugs/{drugId}/administrations', [DrugAdministrationController::class, 'getDrugHistory']);
        
        // Store new administration
        Route::post('drug-administrations', [DrugAdministrationController::class, 'store']);
        
        // Get, update, delete specific administration
        Route::prefix('drug-administrations/{id}')->group(function () {
            Route::get('/', [DrugAdministrationController::class, 'show']);
            Route::put('/', [DrugAdministrationController::class, 'update']);
            Route::delete('/', [DrugAdministrationController::class, 'destroy']);
        });
    });
});

// Pharmacy API Routes (for AJAX calls)
Route::prefix('v1/pharmacy')->group(function () {
    Route::get('/drugs/search', [PharmacyController::class, 'searchDrugs'])->name('api.pharmacy.drugs.search');
    Route::get('/drugs/{id}/details', [PharmacyController::class, 'getDrugDetails'])->name('api.pharmacy.drugs.details');
    Route::get('/drugs/{id}/transactions', [PharmacyController::class, 'getTransactions'])->name('api.pharmacy.drugs.transactions');
    Route::post('/drugs/{id}/physical-count', [PharmacyController::class, 'physicalCount'])->name('api.pharmacy.drugs.physical-count');
    Route::post('/drugs/{id}/receive', [PharmacyController::class, 'receiveStock'])->name('api.pharmacy.drugs.receive');
    Route::post('/drugs/{id}/issue', [PharmacyController::class, 'issueStock'])->name('api.pharmacy.drugs.issue');
    Route::post('/drugs', [PharmacyController::class, 'storeDrug'])->name('api.pharmacy.drugs.store');
});

// Alternative simpler routes if you don't want to nest under patients
Route::apiResource('drug-administrations', DrugAdministrationController::class);