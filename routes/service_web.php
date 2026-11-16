<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Services\ServiceController;

Route::middleware(['auth'])->prefix('services')->name('services.')->group(function () {

    // Display services management page
    Route::get('/department/{departmentId}', [ServiceController::class, 'page'])
        ->name('page');
});

