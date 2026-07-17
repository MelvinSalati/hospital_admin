<?php

namespace App\Services;

use App\Repositories\AppointmentRepository;


class AppointmentService
{
    protected  AppointmentRepository $appointmentRepository;
    /**
     * Create a new class instance.
     */
    public function __construct(AppointmentRepository $appointmentRepository)
    {
        $this->appointmentRepository  =  $appointmentRepository;
    } 

    public function getAppointments($patientId){
        return $this->appointmentRepository->getAppointments($patientId);
    }

    public function getDoctorAppointments($doctorId)
    {
        return $this->appointmentRepository->getDoctorAppointments($doctorId);
     
    }
}
