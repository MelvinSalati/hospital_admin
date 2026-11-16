<?php

use App\Http\Controllers\Patients\OperativeNoteController;
use App\Http\Controllers\Patients\PatientController;
use Illuminate\Support\Facades\Route;

Route::prefix('/patients')->group(function () {
    Route::get('/{patientUuid}', [PatientController::class, 'getPatientDetails']);
    Route::get('/procedures/{Id}', [PatientController::class, 'procedures']);
    Route::get('/theater/op-notess/{patientId}', [OperativeNoteController::class, 'show']);
});
