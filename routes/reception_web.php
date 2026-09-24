<?php

use App\Http\Controllers\Patients\PatientController;
Use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Reception\ReceptionController;
use App\Http\Controllers\Appointments\AppointmentController;
use App\Http\Controllers\Reception\BillController;
use App\Http\Controllers\Patients\QueueController;


Route::prefix('reception')->group(function(){

    Route::get('/dashboard',[ReceptionController::class, 'index']);
    Route::get('/registry',[ReceptionController::class,'search']);
    Route::get('/create',[PatientController::class,'create']);
    Route::get('/appointments',[AppointmentController::class,'index']);
    Route::get('/bills',[BillController::class, 'index']);
    Route::inertia('/reports', 'receptions/report');
    Route::get('payments',[BillController::class, 'payments']);
    Route::get('/queue',[ReceptionController::class, 'queues']);
    Route::get('insurance',[BillController::class, 'insurance']);
    Route::get('visits',[ReceptionController::class,'visits']);


})->middleware(['auth','verified']);



