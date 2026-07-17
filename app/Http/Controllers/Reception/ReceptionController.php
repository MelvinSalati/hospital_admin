<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PatientVisit;
use Inertia\Inertia;

class ReceptionController extends Controller
{
    
    public function appointments(){
        return Inertia::render('receptions/appointments', [
            'appointments' => \App\Models\Appointments\Appointment::query()
                ->join(
                    'patients',
                    'patients.id',
                    '=',
                    'appointments.patient_id'
                )
                ->join(
                    'user_profiles',
                    'user_profiles.user_id',
                    '=',
                    'appointments.doctor_id'
                )
                ->select([
                    'appointments.*',

                    'patients.first_name as patient_first_name',
                    'patients.last_name as patient_last_name',

                    'user_profiles.first_name as doctor_first_name',
                    'user_profiles.surname as doctor_last_name',
                ])
                ->get(),

            'transactions' => [],
            'queue' => [],
        ]);
    }

    public function queues(){
        return Inertia::render('receptions/queues', [
            'active' => PatientVisit::with('patient')->with('invoice')->with('visitToken')->with('assignedDepartment')->Where('status',1)->get(),
            'completed' => PatientVisit::with('patient')->with('visitToken')->with('assignedDepartment')->where('status',0)->get()
        ]);
    }

    public function bills()
    {
        return Inertia::render('receptions/bills',[
            'completed'   => [],
            'pending'     => [],
            'weekly'      => []
        ]);
    }

     public function registry()
    {
        return Inertia::render('receptions/registry');
    }
    public function addPatient()
    {
        return Inertia::render('receptions/create');
    }
     public function dashboard()
    {
        return Inertia::render('receptions/bills');
    }

    public function reports()
    {
        return Inertia::render('receptions/bills');
    }

    public function newPatient(){
        return Inertia::render('receptions/patient');
    }



}
