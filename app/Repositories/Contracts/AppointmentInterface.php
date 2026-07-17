<?php

namespace App\Repositories\Contracts;

interface AppointmentInterface
{
    public function bookAppointment(array $data, int $patientId);
    public function updateAppointment(int $patientId, array $data);
    public function findAppointmentById(int $patientId);
    public function rescheduleAppointment(int $appointmentId, array $data);
    public function getAppointments(int $patientId);
    public function checkAppointmentStatus(int $appointmentId);
}
