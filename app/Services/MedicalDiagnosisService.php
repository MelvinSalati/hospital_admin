<?php

namespace App\Services;

use App\Repositories\MedicalDiagnosisRepository;
use Illuminate\Support\Facades\Log;

class MedicalDiagnosisService
{
    protected $medicalDiagnosisRepository;
    /**
     * Create a new class instance.
     */
    public function __construct(MedicalDiagnosisRepository $medicalDiagnosisRepository)
    {
        $this->medicalDiagnosisRepository = $medicalDiagnosisRepository;
    }

    public function findOrCreate(string $diagnosis){
        Log::info('diagnosis service',[$diagnosis]);
        return $this->medicalDiagnosisRepository->findOrCreate($diagnosis);
    }
}
