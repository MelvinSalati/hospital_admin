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
            ->with(['patient', 'department', 'doctor'])
            ->where('patient_id', $patientId)
            ->orderByDesc('appointment_date')
            ->orderByDesc('appointment_time')
            ->limit(4)
            ->get()
            ->map(fn($appointment) => [
                'id' => $appointment->id,
                'uuid' => $appointment->appointment_uuid,
                'created_at' => $appointment->created_at,
                'date' => $appointment->appointment_date,
                'time' => $appointment->appointment_time,

                'status' => $appointment->status,
                'priority' => $appointment->priority,
                'reason' => $appointment->reason,
                'notes' => $appointment->notes,

                'patient_id' => $appointment->patient_id,
                'patient_name' => $appointment->patient
                    ? trim($appointment->patient->first_name . ' ' . $appointment->patient->last_name)
                    : null,

                'department_id' => $appointment->department_id,
                'department_name' => $appointment->department?->name,

                'doctor_id' => $appointment->doctor_id,
                'doctor_name' => $appointment->doctor?->name,

                'room' => $appointment->room,
                'visit_token' => $appointment->visit_token,
                'scheduled_at' => $appointment->scheduled_at,
            ])
            ->values()
            ->toArray();
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
