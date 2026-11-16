<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Services\ServiceController;

Route::prefix('services')->name('api.services.')->group(function () {

    // Retrieve services by department
    Route::get('/department/{departmentId}', [ServiceController::class, 'index'])
        ->name('index');

    // Register a service
    Route::post('/', [ServiceController::class, 'store'])
        ->name('store');

    // Update an existing service
    Route::put('/{serviceId}', [ServiceController::class, 'update'])
        ->name('update');
});
