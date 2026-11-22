
<?php

use App\Http\Controllers\Administrations\AdminController;
use App\Http\Controllers\Laboratories\LaboratoryBulkStoreController;
use App\Http\Controllers\Laboratories\LaboratoryController as LaboratoriesLaboratoryController;
use App\Http\Controllers\Nurses\NursesController;
use App\Http\Controllers\Patients\PatientController;
use App\Http\Controllers\Pharmacies\SupplierController;
use App\Http\Controllers\Pharmacies\PharmacyController;
use App\Http\Controllers\Pharmacies\OrderController;
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
use App\Http\Controllers\MCH\MchController;
use App\Http\Controllers\Patients\OpthamologyController;
use App\Http\Controllers\Dentals\DentalController;
use App\Http\Controllers\Patients\DentalController as PatientDentalController;
use App\Http\Controllers\Theater\TheaterController;
use App\Http\Controllers\Patients\TheaterController as PatientTheater;
use App\Http\Controllers\Patients\MartenalChildHealthController;
use App\Http\Controllers\Patients\PaymentsController;

use App\Models\Patients\ImagingOrder;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

use Inertia\Inertia;
use Laravel\Fortify\Features;


/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');


/*
|--------------------------------------------------------------------------
| Main Navigation and Dashboard
|--------------------------------------------------------------------------
|
| The department is obtained from:
|
| users.id
|     |
|     v
| user_profiles.user_id
|     |
|     v
| user_profiles.department_id
|     |
|     v
| departments.id
|
| No department IDs or roles are hardcoded here.
|
*/

Route::middleware(['auth', 'verified'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Dynamic Department Dashboard Redirect
    |--------------------------------------------------------------------------
    */

    Route::get('/dashboard', function () {

        $user = auth()->user();

        $department = DB::table('user_profiles')
            ->join(
                'departments',
                'departments.id',
                '=',
                'user_profiles.department_id'
            )
            ->where('user_profiles.user_id', $user->id)
            ->select([
                'departments.id',
                'departments.name',
            ])
            ->first();

        if (!$department) {
            abort(
                403,
                'Your account has no department assigned. Please contact the system administrator.'
            );
        }

        $departmentSlug = Str::slug($department->name);

        return redirect()->to(
            '/' . $departmentSlug . '/dashboard/' . $department->id
        );
    })->name('dashboard');


    /*
    |--------------------------------------------------------------------------
    | General Patient Navigation
    |--------------------------------------------------------------------------
    */

    Route::get('/patients', function () {
        return Inertia::render('patients/registry');
    })->name('patient');


    /*
    |--------------------------------------------------------------------------
    | Reception Navigation
    |--------------------------------------------------------------------------
    */

    Route::get('/reception', function () {
        return Inertia::render('receptions/reception');
    })->name('reception');

    Route::get('/reception/queues', [
        ReceptionController::class,
        'queues',
    ])->name('reception.queues');

    Route::get('/patients/register', [
        PatientController::class,
        'create',
    ])->name('patients.create');


    /*
    |--------------------------------------------------------------------------
    | Pharmacy Navigation
    |--------------------------------------------------------------------------
    */

    Route::get('/pharmacy', [
        PharmacyController::class,
        'index',
    ])->name('pharmacy');


    /*
    |--------------------------------------------------------------------------
    | Maternal and Child Health Navigation
    |--------------------------------------------------------------------------
    */

    Route::get('/mch', [
        MartenalChildHealthController::class,
        'index',
    ])->name('mch');


    /*
    |--------------------------------------------------------------------------
    | Theatre Navigation
    |--------------------------------------------------------------------------
    */

    Route::get('/theater', [
        TheaterController::class,
        'index',
    ])->name('theater');


    /*
    |--------------------------------------------------------------------------
    | Dental Navigation
    |--------------------------------------------------------------------------
    */

    Route::resource('/dental', DentalController::class);


    /*
    |--------------------------------------------------------------------------
    | Ophthalmology Navigation
    |--------------------------------------------------------------------------
    */

    Route::get('/opthamology', [
        OpthamologyController::class,
        'index',
    ])->name('opthamology');
});


/*
|--------------------------------------------------------------------------
| Patient Registration and Management
|--------------------------------------------------------------------------
*/

Route::middleware(['auth'])->group(function () {

    Route::prefix('patients')->group(function () {

        Route::get('/register', [
            PatientController::class,
            'create',
        ])->name('patients.create');

        Route::post('/{userId}', [
            PatientController::class,
            'store',
        ])->name('patients.store');

        Route::get('/dashboard/{id}', [
            PatientController::class,
            'show',
        ])->name('patients.dashboard');

        Route::get('/{id}/edit', [
            PatientController::class,
            'edit',
        ])->name('patients.edit');

        Route::put('/{id}', [
            PatientController::class,
            'update',
        ])->name('patients.update');

        Route::delete('/{id}', [
            PatientController::class,
            'destroy',
        ])->name('patients.destroy');

        Route::post('/{id}/restore', [
            PatientController::class,
            'restore',
        ])->name('patients.restore');


        /*
        |--------------------------------------------------------------------------
        | Patient Payments
        |--------------------------------------------------------------------------
        */

        Route::get('/payment/{patientId}', [
            PaymentsController::class,
            'index',
        ])->name('patient.payment');


        /*
        |--------------------------------------------------------------------------
        | Patient Appointments
        |--------------------------------------------------------------------------
        */

        Route::get('/appointments/{patientId}', [
            AppointmentsController::class,
            'index',
        ])->name('patient.appointments');


        /*
        |--------------------------------------------------------------------------
        | Patient Consultations
        |--------------------------------------------------------------------------
        */

        Route::get('/counsultations/{patientId}', [
            InteractionController::class,
            'index',
        ])->name('patient.consultation');


        /*
        |--------------------------------------------------------------------------
        | Patient Laboratory
        |--------------------------------------------------------------------------
        */

        Route::get('/lab/{patientId}', [
            LaboratoryController::class,
            'index',
        ])->name('patient.laboratory');


        /*
        |--------------------------------------------------------------------------
        | Patient Radiology
        |--------------------------------------------------------------------------
        */

        Route::get('/radiology/{patientId}', [
            RadiologyController::class,
            'index',
        ])->name('patient.radiology');


        /*
        |--------------------------------------------------------------------------
        | Patient Dispensing
        |--------------------------------------------------------------------------
        */

        Route::get('/dispense/{patientId}', [
            PaymentsController::class,
            'index',
        ])->name('patient.dispense');


        /*
        |--------------------------------------------------------------------------
        | Patient Prescription
        |--------------------------------------------------------------------------
        */

        Route::get('/prescription/{patientId}', [
            PaymentsController::class,
            'index',
        ])->name('patient.prescription');


        /*
        |--------------------------------------------------------------------------
        | Patient Discharges
        |--------------------------------------------------------------------------
        |
        | This was previously registered using the same URI and route name
        | as patient.payment. It now has its own URI and route name.
        |
        */

        Route::get('/discharges/{patientId}', [
            DischargesController::class,
            'index',
        ])->name('patient.discharges');


        /*
        |--------------------------------------------------------------------------
        | Patient Maternal and Child Health
        |--------------------------------------------------------------------------
        */

        Route::get('/mch/{patientId}', [
            MartenalChildHealthController::class,
            'index',
        ])->name('patient.mch');


        /*
        |--------------------------------------------------------------------------
        | Patient Dental
        |--------------------------------------------------------------------------
        */

        Route::get('/dental/{patientId}', [
            PatientDentalController::class,
            'index',
        ])->name('patient.dental');


        /*
        |--------------------------------------------------------------------------
        | Patient Theatre
        |--------------------------------------------------------------------------
        */

        Route::get('/theater/{patientId}', [
            PatientTheater::class,
            'index',
        ])->name('patient.theater');


        /*
        |--------------------------------------------------------------------------
        | Patient Ophthalmology
        |--------------------------------------------------------------------------
        */

        Route::get('/opthamology/{patientId}', [
            OpthamologyController::class,
            'index',
        ])->name('patient.opthamology');
    });


    /*
    |--------------------------------------------------------------------------
    | Vital Signs
    |--------------------------------------------------------------------------
    */

    Route::get('/vital-signs/{patientId}', [
        VitalSignsController::class,
        'show',
    ])->name('patient.vitals');

    Route::get('/vital-signs/create/{patientId}', [
        VitalSignsController::class,
        'create',
    ])->name('vitals.create');
});


/*
|--------------------------------------------------------------------------
| Pharmacy Department Routes
|--------------------------------------------------------------------------
|
| The dashboard now receives the department ID dynamically.
|
*/

Route::middleware(['auth', 'verified'])
    ->prefix('pharmacy')
    ->group(function () {

        /*
        |--------------------------------------------------------------------------
        | Pharmacy Dashboard
        |--------------------------------------------------------------------------
        */

        Route::get('/dashboard/{departmentId}', [
            PharmacyController::class,
            'dashboard',
        ])->name('pharmacy.dashboard');


        /*
        |--------------------------------------------------------------------------
        | Pharmacy Suppliers
        |--------------------------------------------------------------------------
        */

        Route::get('/suppliers', [
            SupplierController::class,
            'index',
        ])->name('pharmacy.suppliers');

        Route::post('/suppliers', [
            SupplierController::class,
            'storeSupplier',
        ])->name('pharmacy.suppliers.store');

        Route::put('/suppliers/{id}', [
            SupplierController::class,
            'updateSupplier',
        ])->name('pharmacy.suppliers.update');

        Route::delete('/suppliers/{id}', [
            SupplierController::class,
            'deleteSupplier',
        ])->name('pharmacy.suppliers.delete');


        /*
        |--------------------------------------------------------------------------
        | Pharmacy Orders
        |--------------------------------------------------------------------------
        */

        Route::get('/order-products', [
            OrderController::class,
            'index',
        ])->name('pharmacy.order-products');


        /*
        |--------------------------------------------------------------------------
        | Pharmacy Logistics
        |--------------------------------------------------------------------------
        */

        Route::get('/logistics', [
            PharmacyController::class,
            'logistics',
        ])->name('pharmacy.logistics');


        /*
        |--------------------------------------------------------------------------
        | Pharmacy Drugs
        |--------------------------------------------------------------------------
        */

        Route::get('/drugs', [
            PharmacyController::class,
            'drugs',
        ])->name('pharmacy.drugs');


        /*
        |--------------------------------------------------------------------------
        | Pharmacy Dispensed Products
        |--------------------------------------------------------------------------
        */

        Route::get('/dispensed', [
            PharmacyController::class,
            'getDispensed',
        ])->name('pharmacy.dispensed');


        /*
        |--------------------------------------------------------------------------
        | Pharmacy Stock Monitoring
        |--------------------------------------------------------------------------
        */

        Route::get('/stock-monitoring', [
            PharmacyController::class,
            'stockMonitoring',
        ])->name('pharmacy.stock-monitoring');
    });


/*
|--------------------------------------------------------------------------
| Nurses Department Routes
|--------------------------------------------------------------------------
|
| The dashboard now receives the department ID dynamically.
|
*/

Route::middleware(['auth', 'verified'])
    ->prefix('nurses')
    ->group(function () {

        /*
        |--------------------------------------------------------------------------
        | Nurses Dashboard
        |--------------------------------------------------------------------------
        */

        Route::get('/dashboard/{departmentId}', [
            NursesController::class,
            'dashboard',
        ])->name('nurses.dashboard');


        /*
        |--------------------------------------------------------------------------
        | Nurses Queue
        |--------------------------------------------------------------------------
        */

        Route::get('/queue', [
            NursesController::class,
            'index',
        ])->name('nurses.queue');
    });


/*
|--------------------------------------------------------------------------
| API Token
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {

    Route::post('/api-token', function (Request $request) {

        // Revoke previous tokens of the same name to prevent buildup.
        $request->user()
            ->tokens()
            ->where('name', 'spa')
            ->delete();

        return response()->json([
            'token' => $request->user()
                ->createToken('spa')
                ->plainTextToken,
        ]);
    })->name('api-token');
});


/*
|--------------------------------------------------------------------------
| Patient Clinical Records
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])
    ->prefix('patients')
    ->group(function () {

        Route::get('/opd/{patient}', [
            OPDController::class,
            'index',
        ])->name('patients.opd');

        Route::get('/admissions/{patient}', [
            AdmissionsController::class,
            'index',
        ])->name('patients.admissions');

        Route::get('/discharges/{patient}', [
            DischargesController::class,
            'index',
        ])->name('patients.discharges');

        Route::get('/appointments/{patient}', [
            AppointmentsController::class,
            'index',
        ])->name('patients.appointments');

        Route::get('/consultations/{patient}', [
            InteractionController::class,
            'index',
        ])->name('patients.consultations');

        Route::get('/vital-signs/{patient}', [
            VitalSignsController::class,
            'index',
        ])->name('patients.vitals');

        Route::get('/vital-signs/create/{patient}', [
            VitalSignsController::class,
            'create',
        ])->name('patients.vitals.create');

        Route::get('/lab/{patient}', [
            LaboratoryController::class,
            'index',
        ])->name('patients.lab');

        Route::get('/radiology/{patient}', [
            RadiologyController::class,
            'index',
        ])->name('patients.radiology');

        Route::get('/ultrasound/{patient}', [
            UltrasoundController::class,
            'index',
        ])->name('patients.ultrasound');

        Route::get('/xray/{patient}', [
            XRayController::class,
            'index',
        ])->name('patients.xray');

        Route::get('/pharmacy/dispense/{patient}', [
            DispensingController::class,
            'index',
        ])->name('patients.pharmacy.dispense');

        Route::get('/pharmacy/prescriptions/{patient}', [
            PrescriptionsController::class,
            'index',
        ])->name('patients.pharmacy.prescriptions');

        Route::get('/billing/{patient}', [
            BillingController::class,
            'index',
        ])->name('patients.billing');

        Route::get('/payments/{patient}', [
            PaymentsController::class,
            'index',
        ])->name('patients.payments');
    });


/*
|--------------------------------------------------------------------------
| Payments
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])
    ->prefix('payments')
    ->group(function () {

        Route::get('/', [
            PaymentController::class,
            'index',
        ])->name('payments.index');

        Route::post('/process', [
            PaymentController::class,
            'process',
        ])->name('payments.process');

        Route::put('/payment-method/{id}', [
            PaymentController::class,
            'updatePaymentMethod',
        ])->name('payments.payment-method.update');

        Route::delete('/payment-method/{id}', [
            PaymentController::class,
            'deletePaymentMethod',
        ])->name('payments.payment-method.delete');

        Route::post('/add-payment-method', [
            PaymentController::class,
            'addPaymentMethod',
        ])->name('payments.payment-method.add');
    });


/*
|--------------------------------------------------------------------------
| Imaging Recent Notifications
|--------------------------------------------------------------------------
|
| The department ID is taken from the authenticated user's profile.
|
*/

Route::get('/api/imaging/recent-notifications', function () {

    $departmentId = DB::table('user_profiles')
        ->where('user_id', auth()->id())
        ->value('department_id');

    if (!$departmentId) {
        return response()->json([]);
    }

    return ImagingOrder::where('department_id', $departmentId)
        ->where('created_at', '>=', now()->subMinutes(1))
        ->latest()
        ->limit(5)
        ->get()
        ->map(fn($order) => [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'patientName' => $order->patient?->name,
            'test' => trim(
                ($order->modality ?? '') . ' ' .
                    ($order->body_part ?? '')
            ),
            'createdAt' => $order->created_at->toIso8601String(),
        ]);
})->middleware('auth');


/*
|--------------------------------------------------------------------------
| Authentication Check
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
| Additional Route Files
|--------------------------------------------------------------------------
|
| These files contain the rest of your departmental and application routes.
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
require __DIR__ . '/finance.php';
