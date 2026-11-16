<?php

use App\Http\Controllers\Reports\ReceptionReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/receptions')->group(function () {
    Route::post('daily-revenue/{departmentId}', [ReceptionReportController::class, 'dailyRevenueCollection']);
    Route::post('billing-invoicing/{departmentId}', [ReceptionReportController::class, 'billingAndInvoicing']);
    Route::post('insurance/{departmentId}', [ReceptionReportController::class, 'insuranceBilling']);
});
