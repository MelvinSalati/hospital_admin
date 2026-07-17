<?php

namespace App\Helpers;

use App\Services\MedicalDiagnosisService;

class MedicalDiagnosisHelper
{
    protected $medicalDiagnosisService;
    /**
     * Create a new class instance.
     */
    public function __construct(MedicalDiagnosisService $medicalDiagnosisService)
    {
        $this->medicalDiagnosisService   = $medicalDiagnosisService;
    }


    public function  getDiagnosis(string $diagnosis){
        return $this->medicalDiagnosisService->findOrCreate($diagnosis);
    } 
}
