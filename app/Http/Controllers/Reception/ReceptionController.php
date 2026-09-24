<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PatientVisit;
use App\Services\Receptions\ReceptionService;
use Inertia\Inertia;

class ReceptionController extends Controller
{
    protected ReceptionService $receptionService;

    public function __construct(ReceptionService $service){
        $this->receptionService     = $service;
    }

    /**
     *  renders the dashbiard  specifically dashboard page
     */
    public function index(){
        return  Inertia::render('receptions/dashboard', $this->receptionService->getDashboard());
    }

      public function search(){
        return  Inertia::render('receptions/registry');
    }
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

    public function visits()
    {
        $active = PatientVisit::with('patient')
            ->whereDate('created_at', \Carbon\Carbon::today())
            ->get()
            ->groupBy('patient_id')
            ->map(function ($visits) {
                $first = $visits->first();
                return [
                    'patient_id'     => $first->patient_id,
                    'patient'        => $first->patient,
                    'visits'         => $visits->values(),
                    'visit_count'    => $visits->count(),
                    'latest_visit'   => $visits->sortByDesc('created_at')->first(),
                    'first_seen_at'  => $visits->min('created_at'),
                    'last_seen_at'   => $visits->max('created_at'),
                    'total_billed'   => $visits->sum('amount_billed'),   // adjust to your column
                    'total_paid'     => $visits->sum('amount_paid'), 
                    'created_at'    =>  \Carbon\Carbon::today()->format('d-m-Y'),    // adjust to your column
                ];
            })
            ->values(); // reset keys so JSON is an array, not an object

        return Inertia::render('receptions/visits', [
            'active' => $active,
        ]);
    }
    public function queues()
    {
        return Inertia::render('receptions/queues', [
            'active' => PatientVisit::with('patient')->where('status', 0)->where('department_id', 10)->get(),
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
