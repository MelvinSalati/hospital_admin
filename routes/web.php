<?php

use App\Http\Controllers\Administrations\AdminController;
use App\Http\Controllers\Laboratories\LaboratoryBulkStoreController;
use App\Http\Controllers\Laboratories\LaboratoryController as LaboratoriesLaboratoryController;
use App\Http\Controllers\Nurses\NursesController;
use App\Http\Controllers\Patients\PatientController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Pharmacies\SupplierController;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\Reception\ReceptionController;
use App\Http\Controllers\Patients\OPDController;
use App\Http\Controllers\Patients\AdmissionsController;
use App\Http\Controllers\Patients\DischargesController;
use App\Http\Controllers\Patients\AppointmentsController;
use App\Http\Controllers\Patients\InteractionController;
use App\Http\Controllers\Patients\VitalSignsController;
use App\Http\Controllers\Patients\LaboratoryController;
use App\Http\Controllers\Patients\RadiologyController;
use App\Http\Controllers\Patients\UltrasoundController;
use App\Http\Controllers\Patients\XRayController;
use App\Http\Controllers\Patients\DispensingController;
use App\Http\Controllers\Patients\PrescriptionsController;
use App\Http\Controllers\Patients\BillingController;
use App\Http\Controllers\Patients\PaymentController;
use App\Http\Controllers\BulkStores\BulkStoreController;
use App\Http\Controllers\Users\UserController;
use App\Http\Controllers\Dashboard\MetricsController;
use App\Http\Controllers\Pharmacies\PharmacyController;
use App\Http\Controllers\MCH\MchController;
use App\Http\Controllers\Patients\OpthamologyController;
use App\Http\Controllers\Dentals\DentalController;
use App\Http\Controllers\Patients\DentalController as PatientDentalController;
use App\Http\Controllers\Theater\TheaterController;
use App\Http\Controllers\Patients\TheaterController as PatientTheater;
use App\Http\Controllers\Patients\MartenalChildHealthController;
use App\Http\Controllers\Patients\PaymentsController;
use App\Http\Controllers\Pharmacies\OrderController;
use App\Http\Controllers\Laboratories\LaboratoryController as MainLaboratoryController;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

/***
 * Main navigation
 */
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard',[MetricsController::class,'dashboard'])->name('dashboard');
    Route::get('/patients', function () {
        return Inertia::render('patients/registry');
    })->name('patient');
    Route::get('/reception', function (){
        return Inertia::render('receptions/reception');
    });
     Route::get('patients/register', function (){
        return Inertia::render('receptions/create');
    });
    Route::get('/reception/queues',[ReceptionController::class,'queues']);
    Route::get('/pharmacy', [PharmacyController::class, 'index'])->name('pharmacy');
    Route::get('/mch',[MartenalChildHealthController::class,'index'])->name('mch');
    Route::get('/theater',[TheaterController::class, 'index'])->name('theater');
   Route::resource('/dental', DentalController::class);
    // Route::get('/dental',[DentalController::class, 'índex'])->name('dental');
    Route::get('/opthamology', [OpthamologyController::class, 'index'])->name('opthamology');
    });

Route::middleware(['auth','verified'])->group(function () {
    Route::prefix('reception')->group(function(){
        Route::get('/appointments',[ReceptionController::class, 'appointments']);
        Route::get('/bills',[ReceptionController::class, 'bills']);
        Route::get('/registry',[ReceptionController::class, 'registry']);
        Route::get('/create', [ReceptionController::class, 'addPatient']);
        Route::get('/reports',[ReceptionController::class, 'reports']);
    });

    /**
     * Register patient
     */

    Route::prefix('patients')->group(function () {
        Route::get('/register', [PatientController::class, 'create'])->name('patients.create');
        Route::post('/{userId}', [PatientController::class, 'store'])->name('patients.store');
        Route::get('/{id}', [PatientController::class, 'show'])->name('patients.show');
        Route::get('/{id}/edit', [PatientController::class, 'edit'])->name('patients.edit');
        Route::put('/{id}', [PatientController::class, 'update'])->name('patients.update');
        Route::delete('/{id}', [PatientController::class, 'destroy'])->name('patients.destroy');
        Route::post('/{id}/restore', [PatientController::class, 'restore'])->name('patients.restore');
        Route::get('/search', [PatientController::class, 'search'])->name('patients.search');
        Route::get("/payment/{patientId}", [PaymentsController::class, 'index'])->name('patient.payment');
        Route::get("/appointments/{patientId}", [AppointmentsController::class, 'index'])->name('patient.appointments');
        Route::get("/counsultations/{patientId}", [InteractionController::class, 'index'])->name('patient.consultation');
        Route::get("/lab/{patientId}", [LaboratoryController::class, 'index'])->name('patient.laboratory');
        Route::get("/radiology/{patientId}", [RadiologyController::class, 'index'])->name('patient.radiology');
        Route::get("/dispense/{patientId}", [PaymentsController::class, 'index'])->name('patient.dispense');
        Route::get("/prescription/{patientId}", [PaymentsController::class, 'index'])->name('patient.prescription');
        Route::get('/bills/{patientId}', [BillsController::class, 'index'])->name('patient.bills');
        Route::get("/payment/{patientId}", [DischargesController::class, 'index'])->name('patient.payment');
        Route::get("mch/{patientId}", [MartenalChildHealthController::class, 'index'])->name('patient.mch');
         Route::get("dental/{patientId}", [PatientDentalController::class, 'index'])->name('patient.dental');
         Route::get("theater/{patientId}", [PatientTheater::class, 'index'])->name('patient.theater');
         Route::get("opthamology/{patientId}", [OpthamologyController::class, 'index'])->name('patient.opthamology');


         });



         /**
     * vital signs
     */
    Route::get('vital-signs/{patientId}',[VitalSignsController::class,'show'])->name('patient.vitals');
    Route::get('vital-signs/create/{patientId}',[VitalSignsController::class,'create'])->name('vitals.create');

    /**
     * pharmacy routes
     */

    Route::prefix('/pharmacy')->group(function(){
        Route::get('/suppliers',[PharmacyController::class, 'suppliers']);
        Route::get('/order-products',[OrderController::class,'index']);       Route::get('/dashboard',[PharmacyController::class, 'dashboard']);
        Route::get('/logistics',[PharmacyController::class, 'logistics']);
        Route::get('/drugs',[PharmacyController::class, 'drugs']);
        Route::get('/dispensed', [PharmacyController::class, 'getDispensed']);
        Route::get('/suppliers', [SupplierController::class, 'index'])->name('pharmacy.suppliers');
        Route::post('/suppliers', [SupplierController::class, 'storeSupplier'])->name('pharmacy.suppliers.store');
        Route::put('/suppliers/{id}', [SupplierController::class, 'updateSupplier'])->name('pharmacy.suppliers.update');
        Route::delete('/suppliers/{id}', [SupplierController::class, 'deleteSupplier'])->name('pharmacy.suppliers.delete');
    });
});

Route::middleware(['auth','verified'])
    ->prefix('patients')
    ->group(function () {

    Route::get('/opd/{patient}', [OPDController::class, 'index'])->name('patients.opd');

    Route::get('/admissions/{patient}', [AdmissionsController::class, 'index'])->name('patients.admissions');

    Route::get('/discharges/{patient}', [DischargesController::class, 'index'])->name('patients.discharges');

    Route::get('/appointments/{patient}', [AppointmentsController::class, 'index'])->name('patients.appointments');

    Route::get('/consultations/{patient}', [InteractionController::class, 'index'])->name('patients.consultations');

    Route::get('/vital-signs/{patient}', [VitalSignsController::class, 'index'])->name('patients.vitals');

    Route::get('/vital-signs/create/{patient}', [VitalSignsController::class, 'create'])->name('patients.vitals.create');

    Route::get('/lab/{patient}', [LaboratoryController::class, 'index'])->name('patients.lab');

    Route::get('/radiology/{patient}', [RadiologyController::class, 'index'])->name('patients.radiology');

    Route::get('/ultrasound/{patient}', [UltrasoundController::class, 'index'])->name('patients.ultrasound');

    Route::get('/xray/{patient}', [XRayController::class, 'index'])->name('patients.xray');

    Route::get('/pharmacy/dispense/{patient}', [DispensingController::class, 'index'])->name('patients.pharmacy.dispense');

    Route::get('/pharmacy/prescriptions/{patient}', [PrescriptionsController::class, 'index'])->name('patients.pharmacy.prescriptions');

    Route::get('/billing/{patient}', [BillingController::class, 'index'])->name('patients.billing');

    Route::get('/payments/{patient}', [PaymentsController::class, 'index'])->name('patients.payments');

});

Route::prefix('payments')->group(function () {
    Route::get('/', [PaymentController::class, 'index'])->name('payments.index');
    Route::post('process', [PaymentController::class, 'process'])->name('payments.process');
    Route::put('payment-method/{id}', [PaymentController::class, 'updatePaymentMethod'])->name('payments.payment-method.update');
    Route::delete('payment-method/{id}', [PaymentController::class, 'deletePaymentMethod'])->name('payments.payment-method.delete');
    Route::post('add-payment-method', [PaymentController::class, 'addPaymentMethod'])->name('payments.payment-method.add');
});

Route::middleware(['auth', 'verified'])
    ->prefix('patients')
    ->group(function () {

        Route::get('/opd/{patient}', [OPDController::class, 'index'])->name('patients.opd');
});

/**
 * Nurses separtment
 */

Route::middleware(['auth','verified'])->group(function (){

Route::prefix('nurses/')->group( function (){
        Route::get('/dashboard', [NursesController::class, 'dashboard']);
        Route::get('/queue', [NursesController::class, 'index']);
});


});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('/laboratory')->group(function (){
        Route::get('/', [LaboratoriesLaboratoryController::class, 'index']);
        Route::get('/dashboard', [MainLaboratoryController::class, 'dashboard']);
        Route::get('/processed', [MainLaboratoryController::class, 'processed']);
        Route::get('/logistics', [MainLaboratoryController::class, 'logistics']);
        Route::get('/orders', [MainLaboratoryController::class, 'orders']);
        Route::get('/reports', [MainLaboratoryController::class, 'reports']);
        Route::get('/manage-tests', [MainLaboratoryController::class, 'settings']);
        Route::get('/bulk-store', [LaboratoryBulkStoreController::class, 'index']);
    });

    Route::prefix("user")->group(function () {
        Route::get('/create', function () {
            return Inertia::render('users/register');
        });
    });


    /**
     *  Bulkstore routes
     *
     *
     */

    Route::prefix('bulkstore')->group(function () {
        Route::get('/dashboard', [BulkStoreController::class, 'index']);
        Route::get('/products', [BulkStoreController::class, 'products']);
        Route::get('/orders',[BulkStoreController::class, 'orders']);
        Route::get('/issues',[BulkStoreController::class, 'issues']);
        Route::get('/suppliers',[BulkStoreController::class, 'suppliers']);
    });

    /**
     *  Users managemert routes
     */

    Route::prefix('admin')->group(function () {
        Route::get('/users', [AdminController::class, 'create']);
        Route::get('/users/list', [AdminController::class, 'index']);
    });

    Route::prefix('users')->group(function (){
        Route::get('/manage-account',[UserController::class, 'index']);
    });
});
Route::get('/check-auth', function () {
    return [
        'authenticated' => auth()->check(),
        'user' => auth()->user(),
        'session_id' => session()->getId()
    ];
})->middleware('auth');


require __DIR__ . '/settings.php';
require __DIR__ . '/consultations.php';
require __DIR__ . '/departments.php';
require __DIR__ . '/dispense.php';
