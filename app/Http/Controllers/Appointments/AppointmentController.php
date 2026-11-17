<?php

namespace App\Http\Controllers\Appointments;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Appointments\Appointment;
use App\Repositories\Appointments\AppointmentRepository;
use Inertia\Inertia;


class AppointmentController extends Controller
{
    public function index(int $departmentId)
    {
        return  Inertia::render('nurses/appointments', $this->appointments($departmentId));
    }


    public function appointments(int $departmentId): mixed
    {
        return [
            'appointments' => AppointmentRepository::getAppointments($departmentId)
        ];
    }
    public function receptionAppointments(): mixed
    {
        return  Inertia::render('receptions/appointments', [
            'appointments' => AppointmentRepository::getReceptionAppointments()
        ]);;
    }


    public function updateAppointment(Request $request, int $appointmentId)
    {
        $appointment = Appointment::findOrFail($appointmentId);
        return $appointment->update(['status' => $request->status]);
    }
}
