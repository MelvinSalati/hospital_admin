<?php

use App\Http\Controllers\Consultations\ConsultationController;
use Illuminate\Support\Facades\Route;



Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('/consultation')->group( function(){
        Route::get('/dashboard',[ConsultationController::class,'dashboard']);
        Route::get('/queue', [ConsultationController::class, 'queue']);
        Route::get('/appointment', [ConsultationController::class, 'appointments']);
    });
});