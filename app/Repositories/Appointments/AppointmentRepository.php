<?php

namespace App\Repositories\Appointments;

use App\Models\Appointments\Appointment;
use Carbon\Carbon;

class AppointmentRepository
{
    /**
     * Create a new class instance.
     */
    public function __construct() {}

    public static function getAppointments(int $departmentId)
    {
        $appointments   =  Appointment::with(['patient', 'doctor'])->where('department', $departmentId)
            ->get();

        $appointmentsData =  $appointments->map(function ($appointment) {
            return [
                'appointment_uuid' => $appointment->appointment_uuid,
                'patient_id' => $appointment->patient->patient_number,
                'patient_name' => $appointment->patient->first_name . " " . $appointment->patient->last_name,
                'gender_age'       => ucfirst($appointment->patient->gender) . "/" . Carbon::parse($appointment->patient->date_of_birth)->age,
                'next_appointment_date'  => $appointment->appointment_date,
                'appointment_time'  => $appointment->appointment_time,
                'doctor'    => $appointment->doctor->name,
                'created_by' => $appointment->doctor->name,
                'reason' => $appointment->reason
            ];
        });

        return $appointmentsData;
    }
}
