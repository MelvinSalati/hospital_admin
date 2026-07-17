<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Patients\PrescriptionsController;
use App\Http\Controllers\Patients\InvoiceController;


// Patient routes
Route::prefix('v1/')->group(function () {

    // Prescription routes
    Route::prefix('patients/{patientId}/prescriptions')->group(function () {
        Route::get('/', [PrescriptionsController::class, 'index']);
        Route::post('/', [PrescriptionsController::class, 'store']);
        Route::get('/{prescriptionId}', [PrescriptionsController::class, 'show']);
        Route::put('/{prescriptionId}/status', [PrescriptionsController::class, 'updateStatus']);
        Route::post('/{prescriptionId}/dispense', [PrescriptionsController::class, 'dispense']);
        Route::post('/{prescriptionId}/cancel', [PrescriptionsController::class, 'cancel']);
        Route::get('/{prescriptionId}/invoice', [PrescriptionsController::class, 'getInvoice']);
    });

    // Invoice routes
    Route::prefix('invoices')->group(function () {
        Route::get('/', [InvoiceController::class, 'index']);
        Route::get('/{invoiceId}', [InvoiceController::class, 'show']);
        Route::put('/{invoiceId}/status', [InvoiceController::class, 'updateStatus']);
        Route::post('/{invoiceId}/payments', [InvoiceController::class, 'recordPayment']);
        Route::post('/{invoiceId}/send', [InvoiceController::class, 'send']);
        Route::get('/{invoiceId}/download', [InvoiceController::class, 'download']);
    });

    // Patient pricing routes
    // Route::prefix('pricing')->group(function () {
    //     Route::get('/', [PatientPricingController::class, 'getPricing']);
    //     Route::put('/', [PatientPricingController::class, 'updatePricing']);
    // });
});
