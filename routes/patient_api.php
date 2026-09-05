<?php


use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Patients\PatientController;
use App\Http\Controllers\Patients\RadiologyController;
use App\Http\Controllers\Patients\VitalSignsController;


Route::prefix('v1')->group(function () {
    Route::prefix('/patients')->group(function(){
         Route::get('/', [PatientController::class, 'index']);
        Route::post('/registry/search', [PatientController::class, 'search']);
        Route::get('stats', [PatientController::class, 'getStats']);
        Route::get('insurance', [PatientController::class, 'getByInsurance']);
        Route::post('fingerprint', [PatientController::class, 'findByFingerprint']);
        Route::get('{id}', [PatientController::class, 'show']);
        Route::put('{id}', [PatientController::class, 'update']);
        Route::delete('{id}', [PatientController::class, 'destroy']);
        Route::post('{id}/restore', [PatientController::class, 'restore']);
        Route::post('/{patientId}/radiology/orders', [RadiologyController::class, 'store']);
        Route::post('/vital-signs/{patientId}',[VitalSignsController::class,'store']);
    });
    
    /**
     *  Procedurea
     */
    Route::prefix('/procedures')->group(function(){
        Route::post('/{patientId}/cart',[PatientController::class,'addProcedure']);
    });



});




