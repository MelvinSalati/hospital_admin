<?php



use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Reception\ReceptionController;
use App\Http\Controllers\Appointments\AppointmentController;
use App\Http\Controllers\Nurses\BulkStoreController;
use App\Http\Controllers\Reception\BillController;
use App\Http\Controllers\Patients\QueueController;
use App\Http\Controllers\Patients\PatientController;


Route::prefix('v1/nurses')->group(function () {
  Route::get('/stock', [BulkStoreController::class, 'getProducts']);
  Route::post('/created',[BulkStoreController::class,'orderSupplies']);
});
