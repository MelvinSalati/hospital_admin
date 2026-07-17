<?php

namespace App\Repositories;

use App\Models\MedicalDiagnosis;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class MedicalDiagnosisRepository
{
    /**
     * Find existing diagnosis using similarity matching.
     * Create a new diagnosis if no match is found.
     *
     * @param string $diagnosis
     * @return MedicalDiagnosis|null
     */
  public function findOrCreate(string $diagnosis): ?string
{
    $normalizedInput = trim(strtolower($diagnosis));

    if (empty($normalizedInput)) {
        return null;
    }

    try {

        $candidates = MedicalDiagnosis::query()
            ->whereRaw('LOWER(diagnosis) LIKE ?', [
                '%' . $normalizedInput . '%'
            ])
            ->orWhereRaw('SOUNDEX(diagnosis) = SOUNDEX(?)', [
                $normalizedInput
            ])
            ->limit(10)
            ->get();

        foreach ($candidates as $candidate) {

            $existingDiagnosis = trim(
                strtolower($candidate->diagnosis)
            );

            if (
                $this->isMatchAboveThreshold(
                    $normalizedInput,
                    $existingDiagnosis
                )
            ) {

                Log::info('Existing diagnosis matched', [
                    'input' => $normalizedInput,
                    'matched' => $existingDiagnosis
                ]);

                return ucfirst($candidate->diagnosis);
            }
        }

        $newDiagnosis = $this->createDiagnosis([
            'diagnosis' => $normalizedInput,
            'dx_uuid'   => (string) Str::uuid(),
        ]);

        return $newDiagnosis?->diagnosis;

    } catch (Exception $e) {

        Log::error('findOrCreate failed', [
            'message' => $e->getMessage(),
            'input' => $diagnosis,
        ]);

        return null;
    }
}

    /**
     * Insert new diagnosis into database.
     *
     * @param array $details
     * @return MedicalDiagnosis|null
     */
    protected function createDiagnosis(array $details): ?MedicalDiagnosis
    {
        try {

            Log::info('Creating diagnosis', $details);

            $dx = MedicalDiagnosis::create($details);

            Log::info('Diagnosis created successfully', [
                'id' => $dx->id ?? null,
                'diagnosis' => $dx->diagnosis,
                'uuid' => $dx->dx_uuid,
            ]);

            return $dx;

        } catch (Exception $e) {

            Log::error('Diagnosis insert failed', [
                'message' => $e->getMessage(),
                'data' => $details,
                'trace' => $e->getTraceAsString(),
            ]);

            return null;
        }
    }

    /**
     * Similarity check using Levenshtein distance.
     *
     * @param string $str1
     * @param string $str2
     * @return bool
     */
    protected function isMatchAboveThreshold(
        string $str1,
        string $str2
    ): bool {

        $s1 = trim(strtolower($str1));
        $s2 = trim(strtolower($str2));

        if ($s1 === '' || $s2 === '') {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | Exact match shortcut
        |--------------------------------------------------------------------------
        */

        if ($s1 === $s2) {
            return true;
        }

        /*
        |--------------------------------------------------------------------------
        | Native PHP levenshtein() is optimized in C
        |--------------------------------------------------------------------------
        */

        $distance = levenshtein($s1, $s2);

        $maxLength = max(strlen($s1), strlen($s2));

        if ($maxLength === 0) {
            return false;
        }

        $similarityPercentage = (
            1 - ($distance / $maxLength)
        ) * 100;

        Log::debug('Diagnosis similarity check', [
            'input' => $s1,
            'existing' => $s2,
            'distance' => $distance,
            'similarity_percentage' => round($similarityPercentage, 2),
        ]);

        return $similarityPercentage >= 50;
    }
}
