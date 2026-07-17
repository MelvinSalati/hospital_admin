<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Helpers\VisitTokenHelper;
use App\Services\PatientService;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VitalSignsController extends Controller{
    protected PatientService $patientService;

    public function __construct(PatientService $patientService){
        $this->patientService       = $patientService;
    }
   

    /**
     * Show the form for creating a new resource.
     */
    public function create(int $patientId)
    {
        return Inertia::render('patients/createVitals');
    }

    /**
     * Store a newly created resource in storage.
     */

    public function createVitalSigns(Request $request, $patientId)
    {
        try 
        {
            $visitToken   =  VisitTokenHelper::getActiveToken($patientId);

            $data         = array_merge($request->all(),[
                'visit_token' => $visitToken->token
            ]);

            Log::info('vs-',[$data]);
             if($this->patientService->create($data, $patientId)){
                 return response()->json([
                    'message'       => "Vital signs successfull!",
                    'status'        => 201
                ]);
             }
            
        } catch(\Exception $e){
             return response()->json([
                'message'       => $e->getMessage(),
                'status'        => 500
             ]);
        }
       
    }
    public function updateVitalSigns(Request $request, $patientId)
    {
        return $this->patientService->create($request->all(), $patientId);
    }
    /**
     * Display the specified resource.
     */
     public function index(string $patientId)
    {
        $vitals = $this->patientService->getVitalSigns($patientId);
        $averages = $this->patientService->calculateVitalAverages($patientId);
        
        return Inertia::render('patients/vitals', [
            'vitals' => $vitals,
            'averages' => $averages
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        return true;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
