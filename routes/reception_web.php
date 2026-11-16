<?php

use App\Http\Controllers\Patients\PatientController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Reception\ReceptionController;
use App\Http\Controllers\Appointments\AppointmentController;
use App\Http\Controllers\Reception\BillController;
use App\Http\Controllers\Patients\QueueController;


Route::prefix('reception')->group(function () {

    // Route::get('/dashboard', [ReceptionController::class, 'index']);
    Route::get('/dashboard/{departmentId}', [ReceptionController::class, 'dashboard']);
    Route::get('/registry/{departmentId}', [ReceptionController::class, 'search']);
    Route::get('/create/{departmentId}', [PatientController::class, 'create']);
    Route::get('/appointments/{departmentId}', [AppointmentController::class, 'index']);
    Route::get('/bills/{departmentId}', [BillController::class, 'index']);
    Route::inertia('/reports/{departmentId}', 'receptions/report');
    Route::get('payments/{departmentId}}', [BillController::class, 'payments']);
    Route::get('/queue/{departmentId}', [ReceptionController::class, 'queues']);
    Route::get('insurance/{departmentId}', [BillController::class, 'insurance']);
    Route::get('visits/{departmentId}', [ReceptionController::class, 'visits']);
})->middleware(['auth', 'verified']);
