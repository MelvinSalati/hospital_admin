<?php



use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Nurses\BulkStoreController;
use App\Http\Controllers\Reports\NursesReportController;


Route::prefix('v1/nurses')->group(function () {
    Route::get('/stock', [BulkStoreController::class, 'getProducts']);
    Route::post('/created', [BulkStoreController::class, 'orderSupplies']);
});
// routes/web.php or routes/api.php (inside nurses/auth middleware group)

Route::prefix('v1/nurses/reports')->name('nurses.reports.')->group(function () {
    Route::post('patients-seen-department', [NursesReportController::class, 'patientsSeenDepartment'])
        ->name('patients-seen-department');

    Route::post('patients-cash', [NursesReportController::class, 'patientsCash'])
        ->name('patients-cash');

    Route::post('patients-insurance', [NursesReportController::class, 'patientsInsurance'])
        ->name('patients-insurance');
});
