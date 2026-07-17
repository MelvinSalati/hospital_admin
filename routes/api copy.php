<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Departments\ServiceController;

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\Patients\NursingDiagnosisController;
// use App\Http\Controllers\API\DashboardController;
// use App\Http\Controllers\API\OPDController;
// use App\Http\Controllers\API\BillingController;
use App\Http\Controllers\Patients\PatientController;
use App\Http\Controllers\Patients\AdmissionsController;
// use App\Http\Controllers\API\DoctorController;
// use App\Http\Controllers\API\AppointmentController;
// use App\Http\Controllers\API\PharmacyController;
// use App\Http\Controllers\API\LabController;
// use App\Http\Controllers\API\RadiologyController;
// use App\Http\Controllers\API\ReportController;
// use App\Http\Controllers\API\SettingController;
// use App\Http\Controllers\API\UserController;
use App\Http\Controllers\Departments\DepartmentController;
use App\Http\Controllers\Patients\QueueController;
use App\Http\Controllers\Patients\VitalSignsController;
use App\Http\Controllers\Pharmacies\PharmacyController;
use App\Http\Controllers\Laboratories\LaboratoryBulkStoreController;
use App\Http\Controllers\Patients\PaymentsController;
use App\Http\Controllers\Laboratories\LaboratoryController;
use App\Http\Controllers\Patients\ConsultationController;
use App\Http\Controllers\Patients\InteractionController;
use App\Http\Controllers\Administrations\AdminController;
use App\Models\Departments\Department;

/*
|--------------------------------------------------------------------------
| API V1 Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Public Routes
    |--------------------------------------------------------------------------
    */

    // Route::post('/login', [AuthController::class, 'login']);
    // Route::post('/register', [AuthController::class, 'register']);
    // Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    // Route::post('/reset-password', [AuthController::class, 'resetPassword']);

  




Route::prefix('v1')->group(function () {
    /**
     * visit
     */
    Route::prefix('patient')->group(function (){
        Route::post('create/visit',[QueueController::class,'store']);
    });
    /***
     *  Vitals
     *
     */
    Route::prefix('vital-signs/')->group(function () {
        Route::post('create/{patientId}', [VitalSignsController::class, 'createVitalSigns']);
        Route::patch('update/{vitalSignId}', [VitalSignsController::class, 'updateVitalSign']);
    });

    Route::prefix('departments/')->group(function () {
        Route::get('list', function (){
            return [];
        });;
        Route::post('/queue',[QueueController::class, 'store']);
        Route::patch('update/{vitalSignId}', [VitalSignsController::class, 'updateVitalSign']);
    });

    Route::prefix('labs')->group(function () {
        Route::get('/list', [PharmacyController::class, 'getDrugs']);
        // Route::post("/create");
        // Route::patch('/update')
    });

    Route::prefix('laboratory')->group(function () {
        Route::prefix('/products')->group(function (){
            Route::post('/create', [LaboratoryBulkStoreController::class, 'addProduct']);
            Route::get('/list',[LaboratoryController::class, 'getlaboratoryTests']);
        });
    });

    Route::prefix('pharmacy')->group(function (){
        Route::prefix('/products')->group(function (){
            Route::get('/list',[PharmacyController::class,'getDrugsList']);
        });
    });

    Route::prefix('/consultation')->group(function (){
        Route::post('/create',[ConsultationController::class, 'store']);
        Route::post('/diagnosis/{consultationUuid}', [ConsultationController::class, 'addDiagnosis']);
    });

    Route::prefix('/admin')->group(function (){
        Route::prefix('/user')->group(function(){
            Route::post('/create',[AdminController::class, 'store']);
        });
    });


});
// routes/api.php

Route::prefix('v1')->group(function () {
    // Service routes
    Route::get('/services', [ServiceController::class, 'index']);
    Route::get('/services/paginated', [ServiceController::class, 'paginated']);
    Route::get('/services/statistics', [ServiceController::class, 'statistics']);
    Route::get('/services/zero-priced', [ServiceController::class, 'zeroPriced']);
    Route::get('/services/search', [ServiceController::class, 'search']);
    Route::get('/services/{id}', [ServiceController::class, 'show']);
    Route::get('/services/{id}/price/{paymentType}', [ServiceController::class, 'getPrice']);
    Route::get('/departments/{departmentId}/services', [ServiceController::class, 'getByDepartment']);
    Route::post('/services', [ServiceController::class, 'store']);
    Route::post('/services/bulk-update-prices', [ServiceController::class, 'bulkUpdatePrices']);
    Route::put('/services/{id}', [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);
});

Route::prefix('v1')->group(function () {
    // Department Management Routes
    Route::prefix('departments')->group(function () {

        // Public endpoints (if needed)
        Route::get('list', [DepartmentController::class, 'index'])->name('api.v1.departments.index');
        Route::get('active', [DepartmentController::class, 'getActive'])->name('api.v1.departments.active');

        // Resourceful routes
        Route::get('/', [DepartmentController::class, 'getAll'])->name('api.v1.departments.all');
        Route::get('paginated', [DepartmentController::class, 'getPaginated'])->name('api.v1.departments.paginated');
        Route::get('statistics', [DepartmentController::class, 'statistics'])->name('api.v1.departments.statistics');
        Route::get('search', [DepartmentController::class, 'search'])->name('api.v1.departments.search');

        // CRUD operations
        Route::post('/', [DepartmentController::class, 'store'])->name('api.v1.departments.store');
        Route::get('{id}', [DepartmentController::class, 'show'])->name('api.v1.departments.show');
        Route::get('{id}/edit', [DepartmentController::class, 'edit'])->name('api.v1.departments.edit');
        Route::put('{id}', [DepartmentController::class, 'update'])->name('api.v1.departments.update');
        Route::patch('{id}', [DepartmentController::class, 'update'])->name('api.v1.departments.update.patch');
        Route::delete('{id}', [DepartmentController::class, 'destroy'])->name('api.v1.departments.destroy');

        // Bulk operations
        Route::post('bulk/update-status', [DepartmentController::class, 'bulkUpdateStatus'])->name('api.v1.departments.bulk.update-status');
        Route::post('bulk/delete', [DepartmentController::class, 'bulkDelete'])->name('api.v1.departments.bulk.delete');

        // Department services
        Route::get('{id}/services', [DepartmentController::class, 'getServices'])->name('api.v1.departments.services');
        Route::post('{id}/services', [DepartmentController::class, 'addService'])->name('api.v1.departments.services.add');

        // Export routes
        Route::get('export/excel', [DepartmentController::class, 'exportExcel'])->name('api.v1.departments.export.excel');
        Route::get('export/pdf', [DepartmentController::class, 'exportPdf'])->name('api.v1.departments.export.pdf');
    });
});

// admissions

Route::prefix('v1')->group(function () {
    Route::prefix('admissions')->group(function () {
        Route::post('/', [AdmissionsController::class, 'store']);
    });
});

Route::prefix('v1')->group(function () {

// Nursing Diagnosis Routes (matches your frontend route constants)
Route::prefix('nursing/diagnosis')->group(function () {
    Route::get('/{patientId}', [NursingDiagnosisController::class, 'index'])->name('nursing.diagnosis.index');
    Route::post('/{patientId}', [NursingDiagnosisController::class, 'store'])->name('nursing.diagnosis.create');
    Route::put('/{patientId}/{id}', [NursingDiagnosisController::class, 'update'])->name('nursing.diagnosis.update');
    Route::delete('/{patientId}/{id}', [NursingDiagnosisController::class, 'destroy'])->name('nursing.diagnosis.delete');
    Route::post('/{patientId}/{id}/evaluate', [NursingDiagnosisController::class, 'evaluate'])->name('nursing.diagnosis.evaluate');

    // Optional: Get single diagnosis

    Route::get('/{patientId}/{id}', [NursingDiagnosisController::class, 'show'])->name('nursing.diagnosis.show');

    // Optional: Get statistics
    Route::get('/{patientId}/statistics', [NursingDiagnosisController::class, 'statistics'])->name('nursing.diagnosis.statistics');
});
});

// Payment routes
Route::prefix('patients/{patientId}')->group(function () {
    Route::get('/payments', [PaymentsController::class, 'index']);
    Route::post('/payment', [PaymentsController::class, 'store']);
    Route::get('/payments/{paymentId}', [PaymentsController::class, 'show']);
    Route::put('/payments/{paymentId}', [PaymentsController::class, 'update']);
    Route::delete('/payments/{paymentId}', [PaymentsController::class, 'destroy']);
    Route::get('/payments-summary', [PaymentsController::class, 'summary']);
    Route::get('/payments/{paymentId}/receipt', [PaymentsController::class, 'receipt']);
});
    Route::prefix('v1/patients')->group(function () {

        Route::get('/', [PatientController::class, 'index']);
        Route::post('/{patientId}/payment', [PatientController::class, 'store']);

        Route::post('/search', [PatientController::class, 'search']);
        Route::get('/stats', [PatientController::class, 'getStats']);
        Route::get('/insurance', [PatientController::class, 'getByInsurance']);

        Route::post('/fingerprint', [PatientController::class, 'findByFingerprint']);

        Route::get('/{id}', [PatientController::class, 'show']);
        Route::put('/{id}', [PatientController::class, 'update']);
        Route::delete('/{id}', [PatientController::class, 'destroy']);
        Route::post('/{id}/restore', [PatientController::class, 'restore']);
    });
    Route::get('/patients/{id}', [PatientController::class, 'show'])
        ->name('patients.show');
});

Route::prefix('v1')->group(function () {
    Route::post('admissions/{admissionId}/discharge',[\App\Http\Controllers\Patients\AdmissionController::class,'discharge']);
});

require __DIR__ . '/bulk_stores.php';
require __DIR__ . '/prescriptions.php';
require __DIR__ . '/vitals.php';
require __DIR__ . '/drug.php';
require __DIR__ . '/lab.php';

