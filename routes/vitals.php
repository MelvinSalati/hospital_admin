<?php
// routes/api.php

use App\Http\Controllers\Api\VitalSignsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes for Vital Signs
|--------------------------------------------------------------------------
*/

// Make sure this route is defined BEFORE any resource routes that might capture it
Route::post('v1/patients/vital-signs', [VitalSignsController::class, 'store'])
    ->name('api.patients.vital-signs.store');
    
Route::get('v1/vital-signs/patient/{patientId}', [VitalSignsController::class, 'getPatientVitalSigns'])
    ->where('patientId', '[0-9]+')
    ->name('api.vital-signs.patient');

