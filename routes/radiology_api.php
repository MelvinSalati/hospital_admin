<?php

// use App\Http\Controllers\Patients\LabOrderController;
// use App\Http\Controllers\Laboratories\LaboratoryController;

use App\Http\Controllers\Radiologies\RadiologyController;
use App\Http\Controllers\Reports\RadiologyReportController;
use Illuminate\Support\Facades\Route;


Route::prefix('v1')->group(function () {
    Route::prefix('/radiology')->group(function () {
        Route::post('/reports/{departmentId}', [RadiologyReportController::class, 'getReport']);
        Route::post('orders/{imagingOrder}/results', [RadiologyController::class, 'uploadResult']);
    });
});

// Route::post('{userId}/radiology/{patientId}/orders/{lab_order_id}/results/upload', [RadiologyController::class, 'uploadResults']);


Route::get(
    '/reports/verify/{reportId}/{sig}',
    [RadiologyReportController::class, 'verify'],
)->name('reports.verify');
