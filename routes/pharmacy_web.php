<?php

use App\Http\Controllers\Dashboards\PharmacyDashboardController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Radiologies\RadiologyController;
use App\Http\Controllers\Radiologies\RadiologyBulkStoreController;
use App\Http\Controllers\Reports\RadiologyReportController;
use App\Http\Controllers\Pharmacies\PharmacyController;


Route::prefix('pharmacy')->group(function () {
    Route::get('/', [RadiologyController::class, 'index']);
    Route::get('prescriptions', [PharmacyController::class, 'index']);
    Route::inertia('/reports/{departmentId}', 'pharmacies/reports');
    Route::get('bulk-orders/{departmentId}', [PharmacyController::class, 'bulkstore']);
    // dashboard for pharamcy
    Route::get('/dashboard/{departmentId}', [PharmacyDashboardController::class, 'index']);
});

Route::get('pharmacy/stock-monitoring', [PharmacyController::class, 'stockMonitoring']);
