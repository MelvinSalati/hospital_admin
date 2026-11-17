<?php

use App\Http\Controllers\Administrations\AdminController;
use App\Http\Controllers\Dashboard\MetricsController;
use App\Http\Controllers\Dentals\DentalController;
use App\Http\Controllers\Laboratories\LaboratoryBulkStoreController;
use App\Http\Controllers\Laboratories\LaboratoryController as LaboratoriesLaboratoryController;
use App\Http\Controllers\Laboratories\LaboratoryController as MainLaboratoryController;
use App\Http\Controllers\MCH\MchController;
use App\Http\Controllers\Nurses\NursesController;
use App\Http\Controllers\Patients\AdmissionsController;
use App\Http\Controllers\Patients\AppointmentsController;
use App\Http\Controllers\Patients\BillingController;
use App\Http\Controllers\Patients\DentalController as PatientDentalController;
use App\Http\Controllers\Patients\DischargesController;
use App\Http\Controllers\Patients\DispensingController;
use App\Http\Controllers\Patients\InteractionController;
use App\Http\Controllers\Patients\LaboratoryController;
use App\Http\Controllers\Patients\MartenalChildHealthController;
use App\Http\Controllers\Patients\OPDController;
use App\Http\Controllers\Patients\OpthamologyController;
use App\Http\Controllers\Patients\PatientController;
use App\Http\Controllers\Patients\PaymentController;
use App\Http\Controllers\Patients\PaymentsController;
use App\Http\Controllers\Patients\PrescriptionsController;
use App\Http\Controllers\Patients\RadiologyController;
use App\Http\Controllers\Patients\TheaterController as PatientTheater;
use App\Http\Controllers\Patients\UltrasoundController;
use App\Http\Controllers\Patients\VitalSignsController;
use App\Http\Controllers\Patients\XRayController;
use App\Http\Controllers\Pharmacies\OrderController;
use App\Http\Controllers\Pharmacies\PharmacyController;
use App\Http\Controllers\Pharmacies\SupplierController;
use App\Http\Controllers\Reception\ReceptionController;
use App\Http\Controllers\Theater\TheaterController;
use App\Http\Controllers\Users\UserController;
use App\Models\Patients\ImagingOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');


/*
|--------------------------------------------------------------------------
| Authenticated dashboard and general navigation
|--------------------------------------------------------------------------
|
| Department is read from the authenticated user's profile. Never use a
| department ID supplied by the frontend as the source of authority.
|
*/

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/dashboard', function () {
        $user = auth()->user();

        $roles = $user->profile?->roles ?? [];
        $departmentId = $user->profile?->department_id;

        // Administrators go to the administration dashboard.
        if (in_array('admin', $roles, true)) {
            return redirect('/admin/dashboard');
        }

        // Every departmental account must have an assigned department.
        abort_if(
            !$departmentId,
            403,
            'Your account has not been assigned to a department. Contact the administrator.'
        );

        // Redirect each user to the correct departmental entry point.
        $destinations = [
            'receptionist'   => "/reception/dashboard/{$departmentId}",
            'lab_technician' => '/laboratory/dashboard',
            'bulkstore'      => '/bulkstore/dashboard',
            'pharmacy'       => '/pharmacy/dashboard',
            'radiology'      => '/radiology/dashboard',
            'nurses'         => '/nurses/dashboard',
        ];

        foreach ($destinations as $role => $destination) {
            if (in_array($role, $roles, true)) {
                return redirect($destination);
            }
        }

        // Users without one of the departmental roles use the general dashboard.
        return app(MetricsController::class)->dashboard();
    })->name('dashboard');

    // General patient registry. Keep this shared if your workflow allows
    // authorized staff from multiple departments to view patient records.
    Route::get('/patients', function () {
        return Inertia::render('patients/registry');
    })->name('patient');

    /*
    |--------------------------------------------------------------------------
    | Reception entry points
    |--------------------------------------------------------------------------
    */

    Route::middleware('department:receptionist')->group(function () {
        Route::get('/reception', function () {
            return Inertia::render('receptions/reception');
        });

        Route::get('/patients/register', function () {
            return Inertia::render('receptions/create');
        });

        Route::get('/reception/queues', [ReceptionController::class, 'queues']);
    });

    /*
    |--------------------------------------------------------------------------
    | Other general clinical modules
    |--------------------------------------------------------------------------
    |
    | These are not automatically department-restricted here because patient
    | care may involve more than one department. Apply explicit permissions
    | and scope operational records in the relevant controllers/services.
    |
    */

    Route::get('/mch', [MartenalChildHealthController::class, 'index'])->name('mch');
    Route::get('/theater', [TheaterController::class, 'index'])->name('theater');
    Route::resource('/dental', DentalController::class);
    Route::get('/opthamology', [OpthamologyController::class, 'index'])->name('opthamology');
});


/*
|--------------------------------------------------------------------------
| Patient registration and patient-specific routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {

    Route::prefix('patients')->group(function () {
        Route::get('/register', [PatientController::class, 'create'])
            ->middleware('department')
            ->name('patients.create');

        Route::post('/{userId}', [PatientController::class, 'store'])
            ->middleware('department')
            ->name('patients.store');

        Route::get('/dashboard/{id}', [PatientController::class, 'show']);

        Route::get('/{id}/edit', [PatientController::class, 'edit'])->name('patients.edit');
        Route::put('/{id}', [PatientController::class, 'update'])->name('patients.update');
        Route::delete('/{id}', [PatientController::class, 'destroy'])->name('patients.destroy');
        Route::post('/{id}/restore', [PatientController::class, 'restore'])->name('patients.restore');

        Route::get('/payment/{patientId}', [PaymentsController::class, 'index'])
            ->name('patient.payment');

        Route::get('/appointments/{patientId}', [AppointmentsController::class, 'index'])
            ->name('patient.appointments');

        Route::get('/counsultations/{patientId}', [InteractionController::class, 'index'])
            ->name('patient.consultation');

        Route::get('/lab/{patientId}', [LaboratoryController::class, 'index'])
            ->name('patient.laboratory');

        Route::get('/radiology/{patientId}', [RadiologyController::class, 'index'])
            ->name('patient.radiology');

        Route::get('/dispense/{patientId}', [DispensingController::class, 'index'])
            ->name('patient.dispense');

        Route::get('/prescription/{patientId}', [PrescriptionsController::class, 'index'])
            ->name('patient.prescription');

        Route::get('/mch/{patientId}', [MartenalChildHealthController::class, 'index'])
            ->name('patient.mch');

        Route::get('/dental/{patientId}', [PatientDentalController::class, 'index'])
            ->name('patient.dental');

        Route::get('/theater/{patientId}', [PatientTheater::class, 'index'])
            ->name('patient.theater');

        Route::get('/opthamology/{patientId}', [OpthamologyController::class, 'index'])
            ->name('patient.opthamology');
    });

    Route::get('vital-signs/{patientId}', [VitalSignsController::class, 'show'])
        ->name('patient.vitals');

    Route::get('vital-signs/create/{patientId}', [VitalSignsController::class, 'create'])
        ->name('vitals.create');
});


/*
|--------------------------------------------------------------------------
| Pharmacy routes
|--------------------------------------------------------------------------
|
| All pharmacy pages require authentication and a department assignment.
| Pharmacy controllers must use the department_id from the authenticated
| user's profile/request middleware attribute when querying departmental data.
|
*/

Route::middleware(['auth', 'verified', 'department:pharmacy'])
    ->prefix('pharmacy')
    ->group(function () {

        Route::get('/', [PharmacyController::class, 'index'])->name('pharmacy');

        Route::get('/dashboard', [PharmacyController::class, 'dashboard']);

        Route::get('/suppliers', [SupplierController::class, 'index'])
            ->name('pharmacy.suppliers');

        Route::post('/suppliers', [SupplierController::class, 'storeSupplier'])
            ->name('pharmacy.suppliers.store');

        Route::put('/suppliers/{id}', [SupplierController::class, 'updateSupplier'])
            ->name('pharmacy.suppliers.update');

        Route::delete('/suppliers/{id}', [SupplierController::class, 'deleteSupplier'])
            ->name('pharmacy.suppliers.delete');

        Route::get('/order-products', [OrderController::class, 'index']);
        Route::get('/logistics', [PharmacyController::class, 'logistics']);
        Route::get('/drugs', [PharmacyController::class, 'drugs']);
        Route::get('/dispensed', [PharmacyController::class, 'getDispensed']);
        Route::get('/stock-monitoring', [PharmacyController::class, 'stockMonitoring']);
    });


/*
|--------------------------------------------------------------------------
| Patient clinical workflow routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])
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


/*
|--------------------------------------------------------------------------
| Payment routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])
    ->prefix('payments')
    ->group(function () {

        Route::get('/', [PaymentController::class, 'index'])->name('payments.index');
        Route::post('/process', [PaymentController::class, 'process'])->name('payments.process');
        Route::put('/payment-method/{id}', [PaymentController::class, 'updatePaymentMethod'])
            ->name('payments.payment-method.update');
        Route::delete('/payment-method/{id}', [PaymentController::class, 'deletePaymentMethod'])
            ->name('payments.payment-method.delete');
        Route::post('/add-payment-method', [PaymentController::class, 'addPaymentMethod'])
            ->name('payments.payment-method.add');
    });


/*
|--------------------------------------------------------------------------
| API token
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/api-token', function (Request $request) {
        // Revoke previous tokens of the same name to prevent token buildup.
        $request->user()->tokens()->where('name', 'spa')->delete();

        return response()->json([
            'token' => $request->user()->createToken('spa')->plainTextToken,
        ]);
    });
});


/*
|--------------------------------------------------------------------------
| Nursing department
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified', 'department:nurses'])
    ->prefix('nurses')
    ->group(function () {
        Route::get('/dashboard', [NursesController::class, 'dashboard']);
        Route::get('/queue', [NursesController::class, 'index']);
    });


/*
|--------------------------------------------------------------------------
| Laboratory department
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified', 'department:lab_technician'])
    ->prefix('laboratory')
    ->group(function () {

        Route::get('/', [LaboratoriesLaboratoryController::class, 'index']);
        Route::get('/dashboard', [MainLaboratoryController::class, 'dashboard']);
        Route::get('/processed', [MainLaboratoryController::class, 'processed']);
        Route::get('/logistics', [MainLaboratoryController::class, 'logistics']);
        Route::get('/orders', [MainLaboratoryController::class, 'orders']);
        Route::get('/reports', [MainLaboratoryController::class, 'reports']);
        Route::get('/manage-tests', [MainLaboratoryController::class, 'settings']);
        Route::get('/bulk-store', [LaboratoryBulkStoreController::class, 'index']);
    });


/*
|--------------------------------------------------------------------------
| User registration and administration
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {

    Route::prefix('user')->group(function () {
        Route::get('/create', function () {
            return Inertia::render('users/register', [
                'departments' => \App\Models\Department::all(),
            ]);
        });
    });

    Route::prefix('admin')->group(function () {
        Route::get('/users', [AdminController::class, 'create']);
        Route::get('/users/list', [AdminController::class, 'index']);
    });

    Route::prefix('users')->group(function () {
        Route::get('/manage-account', [UserController::class, 'index']);
    });
});


/*
|--------------------------------------------------------------------------
| Imaging notifications
|--------------------------------------------------------------------------
|
| Do not hardcode department_id = 5. The middleware resolves the current
| user's assigned department and exposes it as the department_id request
| attribute.
|
*/

Route::get('/api/imaging/recent-notifications', function (Request $request) {
    $departmentId = $request->attributes->get('department_id');

    return ImagingOrder::query()
        ->where('department_id', $departmentId)
        ->where('created_at', '>=', now()->subMinutes(1))
        ->latest()
        ->limit(5)
        ->get()
        ->map(fn($order) => [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'patientName' => $order->patient?->name,
            'test' => trim(($order->modality ?? '') . ' ' . ($order->body_part ?? '')),
            'createdAt' => $order->created_at->toIso8601String(),
        ]);
})->middleware(['auth', 'verified', 'department:radiology']);


/*
|--------------------------------------------------------------------------
| Authentication diagnostics
|--------------------------------------------------------------------------
*/

Route::get('/check-auth', function () {
    return [
        'authenticated' => auth()->check(),
        'user' => auth()->user(),
        'session_id' => session()->getId(),
    ];
})->middleware('auth');


/*
|--------------------------------------------------------------------------
| Additional route files
|--------------------------------------------------------------------------
|
| Department-specific routes inside these files must also use:
| Route::middleware(['auth', 'verified', 'department:ROLE'])->group(...)
|
| Do not apply department middleware to every route in a file if it also
| contains shared patient routes or administrator-only routes.
|
*/

require __DIR__ . '/bulk_store_web.php';
require __DIR__ . '/patients_web.php';
require __DIR__ . '/nurses_web.php';
require __DIR__ . '/reception_web.php';
require __DIR__ . '/settings.php';
require __DIR__ . '/consultations.php';
require __DIR__ . '/notifications_web.php';
require __DIR__ . '/departments.php';
require __DIR__ . '/dispense.php';
require __DIR__ . '/admin_web.php';
require __DIR__ . '/lab_web.php';
require __DIR__ . '/radiology_web.php';
require __DIR__ . '/pharmacy_web.php';
require __DIR__ . '/maternal_web.php';
require __DIR__ . '/theatre_web.php';
require __DIR__ . '/dental_web.php';
require __DIR__ . '/opthamology_web.php';
require __DIR__ . '/service_web.php';
