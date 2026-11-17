<?php



use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Reception\ReceptionController;
use App\Http\Controllers\Appointments\AppointmentController;
use App\Http\Controllers\Nurses\BulkStoreController;
use App\Http\Controllers\Reception\BillController;
use App\Http\Controllers\Patients\QueueController;
use App\Http\Controllers\Patients\PatientController;
use App\Http\Controllers\Nurses\NursesController;


Route::prefix('nurses')->group(function () {
    Route::get('/dashboard/{departmentId}', [NursesController::class, 'dashboard']);
    Route::get('/registry/{departmentId}', [ReceptionController::class, 'search']);
    Route::get('/create/{departmentId}', [PatientController::class, 'create']);
    Route::get('/appointments/{departmentId}', [AppointmentController::class, 'index']);
    Route::get('/bills/{departmentId}', [BillController::class, 'index']);
    Route::inertia('/reports/{departmentId}', 'nurses/reports');
    Route::get('/bulk-store/{departmentId}', [BulkStoreController::class, 'index']);
    Route::get('/insurance/{departmentId}', [BillController::class, 'insurance']);
    Route::get('/queue/{departmentId}', [NursesController::class, 'visit']);
    Route::get('/in-patient/{departmentId}', [NursesController::class, 'inPatients']);
    Route::get('/treatment-room/{departmentId}', [NursesController::class, 'treatmentRoom']);
    Route::get('/user-department/{departmentId}', [NursesController::class, 'userDepartment']);
})->middleware(['auth', 'verified', 'department']);
