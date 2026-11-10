<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Appointments\AppointmentController;


Route::prefix('/v1/appointments')->group(function(){
    Route::put('/{appointmentId}',[AppointmentController::class,'updateAppointment']);
});
