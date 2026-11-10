<?php

use App\Http\Controllers\Radiologies\RadiologyController;
use App\Http\Controllers\Reports\RadiologyReportController;
use App\Http\Controllers\Pharmacies\PharmacyController;
use Illuminate\Support\Facades\Route;


Route::prefix('v1')->group(function () {
    Route::prefix('/pharmacy')->group(function () {
        Route::post('/reports/{departmentId}', [RadiologyReportController::class, 'getReport']);
        Route::post('prescriptions/{prescriptionId}/dispense', [PharmacyController::class, 'dispense']);
        // Route::post('')
    });
});

// Route::post('{userId}/radiology/{patientId}/orders/{lab_order_id}/results/upload', [RadiologyController::class, 'uploadResults']);


Route::get(
    '/reports/verify/{reportId}/{sig}',
    [RadiologyReportController::class, 'verify'],
)->name('reports.verify');
