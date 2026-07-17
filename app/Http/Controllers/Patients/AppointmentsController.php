<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Services\AppointmentService;
use App\Models\Departments\Department;
use Illuminate\Support\Facades\DB;
use App\Models\Appointments\Appointment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AppointmentsController extends Controller
{
    protected AppointmentService $appointmentService;

    public function __construct(AppointmentService $appointmentService)
    {
        $this->appointmentService = $appointmentService;
    }

    /**
     * Display a listing of the appointments for a specific patient.
     */
    public function index($patientId)
    {
        $appointments = $this->appointmentService->getAppointments($patientId);

        // Also fetch doctors for the booking form
        $doctors = \App\Models\UserProfile::all();
        // all(); // Adjust based on your Doctor model

        return Inertia::render('patients/appointments', [
            'patientId' => $patientId,
            'appointments' => $appointments,
            'doctors' => $doctors,
            'departments' => Department::all()
        ]);
    }

    /**
     * Store a newly created appointment.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([

            'patient_id' => 'required|exists:patients,id',

            'doctor_id' => 'required|exists:user_profiles,id',

            'department_id' => 'required|integer|exists:departments,id',

            'reason' => 'required|string',

            'appointment_date' => 'required|date|after_or_equal:today',

            'appointment_time' => 'required|string',

            'notes' => 'nullable|string'

        ]);

       try {

         if(!empty($request->input('appointment_id'))){
               $data = [

                    'patient_id' => $validated['patient_id'],

                    'doctor_id' => $validated['doctor_id'],

                    'department' => $validated['department_id'],

                    'status' => $validated['reason'],

                    'appointment_date' => $validated['appointment_date'],

                    'appointment_time' => $validated['appointment_time'],

                    'notes' => $validated['notes'] ?? null,

                    'created_by' => auth()->id(),

                   'priority' => 'normal',

                ];
            $isAppointmentUpdate = $this->updateAppointment($request->input('appointment_id'), $data);
            if($isAppointmentUpdate){
                return response()->json([
                    'message' => 'Appointment updated successfully!'
                ],201);
            } else {
                    return response()->json([
                        'message' => 'Sorry appointment could not e updated!'
                    ], 500);
            }
         }


        /*
        |--------------------------------------------------------------------------
        | Create Appointment
        |--------------------------------------------------------------------------
        */

        $appointment = Appointment::create([

            'patient_id' => $validated['patient_id'],

            'doctor_id' => $validated['doctor_id'],

            'department_id' => $validated['department_id'],

            'reason' => $validated['reason'],

            'appointment_date' => $validated['appointment_date'],

            'appointment_time' => $validated['appointment_time'],

            'notes' => $validated['notes'] ?? null,

            'created_by' => auth()->id(),

            'status' => 'pending',

            'priority' => 'normal',

        ]);

        if($appointment){
            return response()->json([
                'status' => true,
                'message' => 'Appointment booked successfully',

            ], 201);
        }

       } catch(\Exception $e) {
         return response()->json([
                'status' => false,
                'message' => 'Failed to book appointment '.$e->getMessage()
            ], 500);
       }
    }

    public function updateAppointment(int $appointmentId, array $data){
        return Appointment::where('id',$appointmentId)->update($data);
    }

    
}
