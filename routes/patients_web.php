<?php

use App\Http\Controllers\Patients\PatientController;
use Illuminate\Support\Facades\Route;

Route::prefix('/patients')->group(function(){
    Route::get('/{patientUuid}',[PatientController::class, 'getPatientDetails']);
    route::get('/procedures/{Id}', [PatientController::class, 'procedures']);
});
