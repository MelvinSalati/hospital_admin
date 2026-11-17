<?php

namespace App\Repositories\Appointments;

use App\Models\Appointments\Appointment;
use Carbon\Carbon;

class AppointmentRepository
{
    public function __construct() {}

    /**
     * A pending appointment whose date is before today is "missed".
     */
    private static function resolveStatus(Appointment $appointment): ?string
    {
        $status = $appointment->status;

        if (
            strtolower((string) $status) === 'pending'
            && $appointment->appointment_date
            && Carbon::parse($appointment->appointment_date)->startOfDay()->lt(Carbon::today())
        ) {
            return 'missed';
        }

        return $status;
    }

    public static function getAppointments(int $departmentId)
    {
        $appointments = Appointment::with(['patient', 'doctor'])
            ->where('department', $departmentId)
            ->get();

        return $appointments->map(function ($appointment) {
            return [
                'appointment_uuid' => $appointment->appointment_uuid,
                'patient_id'       => $appointment->patient?->patient_number ?? 'N/A',
                'patient_name'     => trim(implode(' ', array_filter([
                    $appointment->patient?->first_name,
                    $appointment->patient?->last_name,
                ]))) ?: 'N/A',
                'gender_age'       => ucfirst($appointment->patient?->gender ?? 'Unknown')
                    . ' / ' .
                    ($appointment->patient?->date_of_birth
                        ? Carbon::parse($appointment->patient->date_of_birth)->age . ' years'
                        : 'N/A'),

                // Date only, "16 November 2026"
                'next_appointment_date' => $appointment->appointment_date
                    ? Carbon::parse($appointment->appointment_date)->format('d F Y')
                    : 'N/A',

                'department'  => $appointment->department?->name ?? 'Across Departments',
                'doctor_name' => trim(($appointment->doctor?->name ?? '') . ' ' . ($appointment->doctor?->last_name ?? '')) ?: 'N/A',
                'created_by'  => $appointment->doctor?->name ?? 'N/A',
                'status'      => self::resolveStatus($appointment),
                'reason'      => $appointment->reason ?? 'N/A',
            ];
        });
    }

    public static function getReceptionAppointments()
    {
        $appointments = Appointment::with(['patient', 'doctor', 'department'])->get();

        return $appointments->map(function ($appointment) {
            return [
                'token' => $appointment->visit_token,
                'id' => $appointment->patient->id,
                'appointment_uuid' => $appointment->appointment_uuid,
                'patient_id'       => $appointment->patient?->patient_number ?? 'N/A',
                'patient_name'     => trim(implode(' ', array_filter([
                    $appointment->patient?->first_name,
                    $appointment->patient?->last_name,
                ]))) ?: 'N/A',
                'gender_age'       => ucfirst($appointment->patient?->gender ?? 'Unknown')
                    . ' / ' .
                    ($appointment->patient?->date_of_birth
                        ? Carbon::parse($appointment->patient->date_of_birth)->age . ' years'
                        : 'N/A'),

                // Date only, "16 November 2026"
                'next_appointment_date' => $appointment->appointment_date
                    ? Carbon::parse($appointment->appointment_date)->format('d F Y')
                    : 'N/A',

                'department'  => $appointment->department?->name ?? 'Across Departments',
                'doctor_name' => trim(($appointment->doctor?->name ?? '') . ' ' . ($appointment->doctor?->last_name ?? '')) ?: 'N/A',
                'created_by'  => $appointment->doctor?->name ?? 'N/A',
                'status'      => self::resolveStatus($appointment),
                'reason'      => $appointment->reason ?? 'N/A',
            ];
        });
    }
}
