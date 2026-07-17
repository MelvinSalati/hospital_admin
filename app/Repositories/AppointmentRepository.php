<?php

namespace App\Repositories;

use App\Repositories\Contracts\AppointmentInterface;
use App\Models\Appointments\Appointment;

class AppointmentRepository implements AppointmentInterface
{
    protected Appointment $appointment;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
    }

    public function bookAppointment(array $data, int $patientId)
    {
        return $this->appointment->create($data);
    }

    public function updateAppointment(int $appointmentId, array $data)
    {
        $appointment = $this->findAppointmentById($appointmentId);
        $appointment->update($data);

        return $appointment;
    }

    public function rescheduleAppointment(int $appointmentId, array $data)
    {
        return $this->updateAppointment($appointmentId, $data);
    }

    public function findAppointmentById(int $appointmentId)
    {
        return $this->appointment->findOrFail($appointmentId);
    }

    public function getAppointments(int $patientId)
    {
        return $this->appointment
            ->where('patient_id', $patientId)
            ->orderByDesc('appointment_date')
            ->orderByDesc('appointment_time')
            ->limit(4)
            ->get();
    }

    public function checkAppointmentStatus(int $appointmentId)
    {
        return $this->appointment
            ->where('id', $appointmentId)
            ->value('status');
    }

    /**
     * Optional but HIGHLY recommended
     */
    public function getTodayAppointments()
    {
        return $this->appointment->today()->get();
    }

    public function getDoctorAppointments(int $doctorId)
    {
        return Appointment::join('users','users.id','=','appointments.doctor_id')->join('patients','patients.id','=','appointments.patient_id')
    ->where('doctor_id',26)->get(['users.name as doctor_name','patients.first_name as patient_name','appointments.status','appointment_date as appointmentDate']);
    }
}
