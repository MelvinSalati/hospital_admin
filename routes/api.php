<?php

use App\Http\Controllers\Patients\ImagingOrderController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Pharmacies\OrderController;
use App\Http\Controllers\Departments\ServiceController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\Patients\NursingDiagnosisController;
use App\Http\Controllers\Patients\PatientController;
use App\Http\Controllers\Patients\AdmissionsController;
use App\Http\Controllers\Departments\DepartmentController;
use App\Http\Controllers\Patients\QueueController;
use App\Http\Controllers\Patients\VitalSignsController;
use App\Http\Controllers\Pharmacies\PharmacyController;
use App\Http\Controllers\Laboratories\LaboratoryBulkStoreController;
use App\Http\Controllers\Patients\PaymentController;
use App\Http\Controllers\Laboratories\LaboratoryController;
use App\Http\Controllers\Patients\ConsultationController;
use App\Http\Controllers\Patients\InteractionController;
use App\Http\Controllers\Administrations\AdminController;
use App\Http\Controllers\Patients\VisitTokenController;
use App\Http\Controllers\Patients\AntenatalScreeningController;
use App\Http\Controllers\Patients\MartenalChildHealthController;
use App\Http\Controllers\Patients\OpthamologyController;
use App\Http\Controllers\Patients\TheaterController;
use App\Http\Controllers\Patients\DentalController;
use App\Http\Controllers\Pharmacies\SupplierController;
use App\Http\Controllers\Laboratories\LaboratorySettingsController;

/*
|--------------------------------------------------------------------------
| API V1 Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Public Routes (Commented)
    |--------------------------------------------------------------------------
    */
    // Route::post('/login', [AuthController::class, 'login']);
    // Route::post('/register', [AuthController::class, 'register']);
    // Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    // Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    /*
    |--------------------------------------------------------------------------
    | Patient Visit & Queue
    |--------------------------------------------------------------------------
    */
    Route::post('/register/patients/{userId}', [PatientController::class, 'store']);
    Route::prefix('patient')->group(function () {
        Route::post('create/visit', [QueueController::class, 'store']);
    });

    /*
    |--------------------------------------------------------------------------
    | Vital Signs
    |--------------------------------------------------------------------------
    */
    Route::prefix('vital-signs')->group(function () {
        Route::post('create/{patientId}', [VitalSignsController::class, 'createVitalSigns']);
        Route::patch('update/{vitalSignId}', [VitalSignsController::class, 'updateVitalSign']);
    });

    /*
    |--------------------------------------------------------------------------
    | Departments (Basic + Queue mix)
    |--------------------------------------------------------------------------
    */
    Route::prefix('departments')->group(function () {
        Route::get('list', fn() => []);
        Route::post('queue', [QueueController::class, 'store']);
        Route::patch('update/{vitalSignId}', [VitalSignsController::class, 'updateVitalSign']);
    });

    /*
    |--------------------------------------------------------------------------
    | Labs & Pharmacy (Quick Access)
    |--------------------------------------------------------------------------
    */
    Route::prefix('labs')->group(function () {
        Route::get('list', [PharmacyController::class, 'getDrugs']);
    });

    Route::prefix('laboratory')->group(function () {
        // Products routes
        Route::prefix('products')->group(function () {
            Route::post('create', [LaboratoryBulkStoreController::class, 'addProduct']);
            Route::get('list', [LaboratoryController::class, 'getlaboratoryTests']);
        });

        // ============================================
        // LABORATORY SETTINGS ROUTES
        // ============================================

        // Test Configurations
        Route::prefix('tests')->group(function () {
            Route::get('/', [LaboratorySettingsController::class, 'getTests']);
            Route::post('/', [LaboratorySettingsController::class, 'storeTest']);
            Route::get('/{id}', [LaboratorySettingsController::class, 'getTest']);
            Route::put('/{id}', [LaboratorySettingsController::class, 'updateTest']);
            Route::delete('/{id}', [LaboratorySettingsController::class, 'deleteTest']);
            Route::patch('/{id}/toggle', [LaboratorySettingsController::class, 'toggleTestStatus']);

            // Test Parameters
            Route::get('/{testId}/parameters', [LaboratorySettingsController::class, 'getParameters']);
            Route::post('/{testId}/parameters', [LaboratorySettingsController::class, 'storeParameter']);
            Route::put('/parameters/{id}', [LaboratorySettingsController::class, 'updateParameter']);
            Route::delete('/parameters/{id}', [LaboratorySettingsController::class, 'deleteParameter']);
            Route::patch('/parameters/{id}/toggle', [LaboratorySettingsController::class, 'toggleParameterStatus']);
        });

        // Test Categories
        Route::prefix('categories')->group(function () {
            Route::get('/', [LaboratorySettingsController::class, 'getCategories']);
            Route::post('/', [LaboratorySettingsController::class, 'storeCategory']);
            Route::get('/{id}', [LaboratorySettingsController::class, 'getCategory']);
            Route::put('/{id}', [LaboratorySettingsController::class, 'updateCategory']);
            Route::delete('/{id}', [LaboratorySettingsController::class, 'deleteCategory']);
            Route::patch('/{id}/toggle', [LaboratorySettingsController::class, 'toggleCategoryStatus']);
        });

        // Test Results
        Route::prefix('results')->group(function () {
            Route::get('/orders/{orderId}', [LaboratorySettingsController::class, 'getResults']);
            Route::post('/orders/{orderId}', [LaboratorySettingsController::class, 'storeResults']);
            Route::put('/{id}', [LaboratorySettingsController::class, 'updateResult']);
            Route::patch('/{id}/verify', [LaboratorySettingsController::class, 'verifyResult']);
            Route::patch('/{id}/reject', [LaboratorySettingsController::class, 'rejectResult']);
        });

        // Test Orders
        Route::prefix('orders')->group(function () {
            Route::get('/', [LaboratorySettingsController::class, 'getOrders']);
            Route::post('/', [LaboratorySettingsController::class, 'storeOrder']);
            Route::get('/{id}', [LaboratorySettingsController::class, 'getOrder']);
            Route::put('/{id}', [LaboratorySettingsController::class, 'updateOrder']);
            Route::delete('/{id}', [LaboratorySettingsController::class, 'deleteOrder']);
            Route::patch('/{id}/status', [LaboratorySettingsController::class, 'updateOrderStatus']);
            Route::post('/{id}/collect', [LaboratorySettingsController::class, 'collectSample']);
            Route::post('/{id}/results', [LaboratorySettingsController::class, 'enterResults']);
        });
    });

    Route::prefix('pharmacy')->group(function () {
        Route::prefix('products')->group(function () {
            Route::get('list', [PharmacyController::class, 'getDrugsList']);
        });
        // Route::post('/supplier',[SupplierController::class,'storeSupplier']);
    });

    Route::prefix('pharmacy')->group(function () {
        Route::get('/suppliers', [SupplierController::class, 'getSuppliers']);
        Route::get('/suppliers/{id}', [SupplierController::class, 'getSupplier']);
        Route::post('/suppliers', [SupplierController::class, 'storeSupplier']);
        Route::put('/suppliers/{id}', [SupplierController::class, 'updateSupplier']);
        Route::delete('/suppliers/{id}', [SupplierController::class, 'deleteSupplier']);
        Route::patch('/suppliers/{id}/toggle', [SupplierController::class, 'toggleSupplierStatus']);
        Route::post('/receive-stock', [PharmacyController::class, 'receiveStock'])->name('pharmacy.receive-stock');
        Route::post('/order-products',[OrderController::class,'orderStock']);
    });

    /*
    |--------------------------------------------------------------------------
    | Consultation
    |--------------------------------------------------------------------------
    */
    Route::prefix('consultation')->group(function () {
        Route::post('create', [ConsultationController::class, 'store']);
        Route::post('diagnosis/{consultationUuid}', [ConsultationController::class, 'addDiagnosis']);
    });

    /*
    |--------------------------------------------------------------------------
    | Admin
    |--------------------------------------------------------------------------
    */
    Route::prefix('admin')->group(function () {
        Route::prefix('user')->group(function () {
            Route::post('create', [AdminController::class, 'store']);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Services
    |--------------------------------------------------------------------------
    */
    Route::get('services', [ServiceController::class, 'index']);
    Route::get('services/paginated', [ServiceController::class, 'paginated']);
    Route::get('services/statistics', [ServiceController::class, 'statistics']);
    Route::get('services/zero-priced', [ServiceController::class, 'zeroPriced']);
    Route::get('services/search', [ServiceController::class, 'search']);
    Route::get('services/{id}', [ServiceController::class, 'show']);
    Route::get('services/{id}/price/{paymentType}', [ServiceController::class, 'getPrice']);
    Route::get('departments/{departmentId}/services', [ServiceController::class, 'getByDepartment']);

    Route::post('services', [ServiceController::class, 'store']);
    Route::post('services/bulk-update-prices', [ServiceController::class, 'bulkUpdatePrices']);
    Route::put('services/{id}', [ServiceController::class, 'update']);
    Route::delete('services/{id}', [ServiceController::class, 'destroy']);

    /*
    |--------------------------------------------------------------------------
    | Department Management (Full)
    |--------------------------------------------------------------------------
    */
    Route::prefix('departments')->group(function () {

        Route::get('list', [DepartmentController::class, 'index'])->name('api.v1.departments.index');
        Route::get('active', [DepartmentController::class, 'getActive'])->name('api.v1.departments.active');

        Route::get('/', [DepartmentController::class, 'getAll']);
        Route::get('paginated', [DepartmentController::class, 'getPaginated']);
        Route::get('statistics', [DepartmentController::class, 'statistics']);
        Route::get('search', [DepartmentController::class, 'search']);

        Route::post('/', [DepartmentController::class, 'store']);
        Route::get('{id}', [DepartmentController::class, 'show']);
        Route::get('{id}/edit', [DepartmentController::class, 'edit']);
        Route::put('{id}', [DepartmentController::class, 'update']);
        Route::patch('{id}', [DepartmentController::class, 'update']);
        Route::delete('{id}', [DepartmentController::class, 'destroy']);

        Route::post('bulk/update-status', [DepartmentController::class, 'bulkUpdateStatus']);
        Route::post('bulk/delete', [DepartmentController::class, 'bulkDelete']);

        Route::get('{id}/services', [DepartmentController::class, 'getServices']);
        Route::post('{id}/services', [DepartmentController::class, 'addService']);

        Route::get('export/excel', [DepartmentController::class, 'exportExcel']);
        Route::get('export/pdf', [DepartmentController::class, 'exportPdf']);
    });

    /*
    |--------------------------------------------------------------------------
    | Admissions
    |--------------------------------------------------------------------------
    */
    Route::prefix('admissions')->group(function () {
        Route::post('/', [AdmissionsController::class, 'store']);
    });

    Route::post('admissions/{admissionId}/discharge', [
        \App\Http\Controllers\Patients\AdmissionsController::class,
        'discharge'
    ]);

    /*
    |--------------------------------------------------------------------------
    | Nursing Diagnosis
    |--------------------------------------------------------------------------
    */
    Route::prefix('nursing/diagnosis')->group(function () {
        Route::get('{patientId}', [NursingDiagnosisController::class, 'index']);
        Route::post('{patientId}', [NursingDiagnosisController::class, 'store']);
        Route::put('{patientId}/{id}', [NursingDiagnosisController::class, 'update']);
        Route::delete('{patientId}/{id}', [NursingDiagnosisController::class, 'destroy']);
        Route::put('{patientId}/{id}/evaluate', [NursingDiagnosisController::class, 'evaluate']);

        Route::get('{patientId}/{id}', [NursingDiagnosisController::class, 'show']);
        Route::get('{patientId}/statistics', [NursingDiagnosisController::class, 'statistics']);
    });

    /*
    |--------------------------------------------------------------------------
    | Payments
    |--------------------------------------------------------------------------
    */
    Route::prefix('patients/{patientId}')->group(function () {
        Route::get('payments', [PaymentsController::class, 'index']);
        Route::post('payment/process', [PaymentController::class, 'process']);
        Route::get('payments/{paymentId}', [PaymentsController::class, 'show']);
        Route::put('payments/{paymentId}', [PaymentsController::class, 'update']);
        Route::delete('payments/{paymentId}', [PaymentsController::class, 'destroy']);
        Route::get('payments-summary', [PaymentsController::class, 'summary']);
        Route::get('payments/{paymentId}/receipt', [PaymentsController::class, 'receipt']);
    });

    Route::prefix('/payments')->group(function () {
        Route::post('/process', [PaymentController::class, 'process']);
    });

    /*
    |--------------------------------------------------------------------------
    | Patients
    |--------------------------------------------------------------------------
    */
    Route::prefix('antenatal/')->group(function () {
        Route::post('initial-screening', [AntenatalScreeningController::class, 'store']);
    });

    Route::post('/patients/{patientId}/martenal-orders', [MartenalChildHealthController::class, 'orderMCHService']);
    Route::post('patients/{patientId}/opthamology-order', [OpthamologyController::class, 'orderOpthamologyService']);
    Route::prefix('mch/')->group(function () {
        Route::post('order-service/{patientId}', [MartenalChildHealthController::class, 'orderMCHService']);
    });
    Route::post('patients/{patientId}/theater-order', [TheaterController::class, 'orderTheaterServices']);

    Route::prefix('patients')->group(function () {
        Route::get('/', [PatientController::class, 'index']);
        Route::post('{patientId}/payment', [PaymentsController::class, 'store']);

        Route::post('search', [PatientController::class, 'search']);
        Route::get('stats', [PatientController::class, 'getStats']);
        Route::get('insurance', [PatientController::class, 'getByInsurance']);
        Route::post('fingerprint', [PatientController::class, 'findByFingerprint']);

        Route::get('{id}', [PatientController::class, 'show']);
        Route::put('{id}', [PatientController::class, 'update']);
        Route::delete('{id}', [PatientController::class, 'destroy']);
        Route::post('{id}/restore', [PatientController::class, 'restore']);
    });



    // Imaging Orders Routes
    Route::prefix('patients/{patientId}')->group(function () {
        Route::get('/', [ImagingOrderController::class, 'index']);
        Route::post('/imaging-orders', [ImagingOrderController::class, 'store']);
        // Route::get('/{id}', [ImagingOrderController::class, 'show']);
        Route::put('/{id}/status', [ImagingOrderController::class, 'updateStatus']);
        Route::get('/{id}/invoice', [ImagingOrderController::class, 'getInvoice']);
        Route::get('/{id}/report', [ImagingOrderController::class, 'getReport']);
    });
    Route::post('patients/{patientId}/dental-order', [DentalController::class, 'orderDentalServices']);

    Route::get('patients/{id}', [PatientController::class, 'show'])->name('patients.show');

    Route::prefix('visit-token')->group(function () {
        Route::post('/generate', [VisitTokenController::class, 'generate']);
        Route::get('/active/{patientId}', [VisitTokenController::class, 'getActiveToken']);
        Route::post('/validate', [VisitTokenController::class, 'validateToken']);
        Route::post('/complete/{patientId}', [VisitTokenController::class, 'completeVisit']);
        Route::post('/cancel/{patientId}', [VisitTokenController::class, 'cancelVisit']);
        Route::get('/all-active', [VisitTokenController::class, 'getAllActiveTokens']);
        Route::post('/cleanup', [VisitTokenController::class, 'cleanupExpired']);
    });
});

Route::post('v1/register/patients/{userId}', [PatientController::class, 'store']);

// In routes/api.php
Route::get('/appointments/available-slots', function (Request $request) {
    $doctorId = $request->get('doctor_id');
    $date = $request->get('date');

    $existingAppointments = \App\Models\Appointment::where('doctor_id', $doctorId)
        ->where('date', $date)
        ->whereNotIn('status', ['cancelled'])
        ->get(['time']);

    return response()->json([
        'existingAppointments' => $existingAppointments
    ]);
});

Route::prefix('v1/appointments')->group(function () {
    Route::post('/create', [App\Http\Controllers\Patients\AppointmentsController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| External Route Files
|--------------------------------------------------------------------------
*/
require __DIR__ . '/bulk_stores.php';
require __DIR__ . '/prescriptions.php';
require __DIR__ . '/vitals.php';
require __DIR__ . '/drug.php';
require __DIR__ . '/lab.php';
