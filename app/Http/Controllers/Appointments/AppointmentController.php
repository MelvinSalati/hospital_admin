<?php

namespace App\Http\Controllers\Appointments;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Appointments\Appointment;
use Inertia\Inertia;


class AppointmentController extends Controller
{
    public function index(){
        return  Inertia::render('appointments/appointments',$this->appointments());
    }


    public function appointments(): array
    {
        $appointments = Appointment::with(['patient', 'creator', 'department'])->get()->map(function ($appointment) {
            return [
                'id' => $appointment->id,
                'patient_id' => $appointment->patient_id? $appointment->patient->patient_number : 'Unknown',
                'patient_name' => $appointment->patient ? $appointment->patient->first_name . ' ' . $appointment->patient->last_name : 'Unknown',
                'doctor_name' => $appointment->creator ? $appointment->creator->name : 'Unknown',
                'department' => $appointment->department ? $appointment->department: 'General',
                'reason' => $appointment->reason,
                'time' => $appointment->appointment_time,
                'status' => $appointment->status,
            ];
        });

        return [
            'appointments' => $appointments
        ];
    }
}
