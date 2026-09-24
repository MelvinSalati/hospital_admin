<?php



use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Reception\ReceptionController;
use App\Http\Controllers\Appointments\AppointmentController;
use App\Http\Controllers\Nurses\BulkStoreController;
use App\Http\Controllers\Reception\BillController;
use App\Http\Controllers\Patients\QueueController;
use App\Http\Controllers\Patients\PatientController;
use App\Http\Controllers\Nurses\NursesController;


Route::prefix('nurses')->group(function(){
    Route::get('/dashboard',[ReceptionController::class, 'index']);
    Route::get('/registry',[ReceptionController::class,'search']);
    Route::get('/create',[PatientController::class,'create']);
    Route::get('/appointments',[AppointmentController::class,'index']);
    Route::get('/bills',[BillController::class, 'index']);
    Route::inertia('/reports', 'receptions/report');
    Route::get('/bulk-store',[BulkStoreController::class, 'index']);
    Route::get('/insurance',[BillController::class, 'insurance']);
    Route::get('/visits', [NursesController::class,'visit']);
    Route::get('/in-patient',[NursesController::class, 'inPatients']);
    Route::get('/treatment-room',[NursesController::class, 'treatmentRoom']);
    Route::get('/user-department', [NursesController::class, 'userDepartment']);
})->middleware(['auth','verified']);



