<?php

namespace App\Repositories\Contracts;

use App\Models\Patients\Patient;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface PatientRepositoryInterface
{
     /**
     * Get all patients.
     */
    public function all(array $columns = ['*']): Collection;

    /**
     * Paginate patients.
     */
    public function paginate(int $perPage = 15, array $columns = ['*']): LengthAwarePaginator;

    /**
     * Find patient by ID.
     */
    public function find(int $id): ?Patient;

    /**
     * Find patient by patient number.
     */
    public function findByPatientNumber(string $patientNumber): ?Patient;

    /**
     * Create a new patient.
     */
    public function create(array $data): Patient;

    /**
     * Update an existing patient.
     */
    public function update(int $id, array $data): bool;

    /**
     * Delete a patient (soft delete).
     */
    public function delete(int $id): bool;

    /**
     * Restore a soft-deleted patient.
     */
    public function restore(int $id): bool;

    /**
     * Search patients by name, phone, or email.
     */
    public function search(string $query, string $type); 
}
