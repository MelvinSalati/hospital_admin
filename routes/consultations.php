<?php

use App\Http\Controllers\Consultations\ConsultationController;
use App\Http\Controllers\Appointments\AppointmentController;
use Illuminate\Support\Facades\Route;



Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('/consultation')->group(function () {
        Route::get('/dashboard/{departmentId}', [ConsultationController::class, 'dashboard']);
        Route::get('/queue/{departmentId}', [ConsultationController::class, 'queue']);
        Route::get('/appointment/{departmentId}', [AppointmentController::class, 'index']);
    });
});
