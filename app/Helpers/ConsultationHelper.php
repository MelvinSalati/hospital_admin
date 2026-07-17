<?php

namespace App\Helpers;

use App\Models\Patients\Consultation;

class ConsultationHelper
{
    private Consultation $consultation;
    private array $chiefComplaints;
    private array $clinicalAnalysis;
    private array $drugHistory;
    private array $healthEducation;
    private array $imagingOrders;
    private array $labOrders;
    private array $medicalConditions;
    private array $physicalExam;
    private array $prescription;

    public function __construct(Consultation $consultation)
    {
        $this->consultation = $consultation;
        $this->loadData();
    }

    private function loadData(): void
    {
        $this->chiefComplaints = json_decode($this->consultation->chief_complaints ?? '[]', true) ?: [];
        $this->clinicalAnalysis = json_decode($this->consultation->clinical_analysis ?? '[]', true) ?: [];
        $this->drugHistory = json_decode($this->consultation->drug_history ?? '[]', true) ?: [];
        $this->healthEducation = json_decode($this->consultation->health_education ?? '[]', true) ?: [];
        $this->imagingOrders = json_decode($this->consultation->imaging_orders ?? '[]', true) ?: [];
        $this->labOrders = json_decode($this->consultation->lab_orders ?? '[]', true) ?: [];
        $this->medicalConditions = json_decode($this->consultation->medical_conditions ?? '[]', true) ?: [];
        $this->physicalExam = json_decode($this->consultation->physical_exam ?? '[]', true) ?: [];
    }

    // ============ Chief Complaints Methods ============

    public function getChiefComplaints(): array
    {
        return $this->chiefComplaints;
    }

    public function getChiefComplaint(int $index = 0): ?array
    {
        return $this->chiefComplaints[$index] ?? null;
    }

    public function getChiefComplaintSymptom(int $index = 0): ?string
    {
        return $this->chiefComplaints[$index]['symptom'] ?? null;
    }

    public function getChiefComplaintDuration(int $index = 0): ?string
    {
        return $this->chiefComplaints[$index]['duration'] ?? null;
    }

    public function getChiefComplaintSeverity(int $index = 0): ?int
    {
        return $this->chiefComplaints[$index]['severity'] ?? null;
    }

    public function getChiefComplaintOnset(int $index = 0): ?string
    {
        return $this->chiefComplaints[$index]['onset'] ?? null;
    }

    public function getChiefComplaintCharacteristics(int $index = 0): mixed
    {
        return $this->chiefComplaints[$index]['characteristics'] ?? null;
    }

    // ============ Clinical Analysis Methods ============

    public function getClinicalAnalysis(): array
    {
        return $this->clinicalAnalysis;
    }

    public function getClinicalAnalysisSystem(int $index = 0): ?string
    {
        return $this->clinicalAnalysis[$index]['system'] ?? null;
    }

    // ============ Drug History Methods ============

    public function getDrugHistory(): array
    {
        return $this->drugHistory;
    }

    public function getDrugHistoryItem(int $index = 0): ?array
    {
        return $this->drugHistory[$index] ?? null;
    }

    public function getDrugHistoryDrugName(int $index = 0): ?string
    {
        return $this->drugHistory[$index]['drugName'] ?? null;
    }

    public function getDrugHistoryId(int $index = 0): ?string
    {
        return $this->drugHistory[$index]['id'] ?? null;
    }

    // ============ Health Education Methods ============

    public function getHealthEducation(): array
    {
        return $this->healthEducation;
    }

    // ============ Imaging Orders Methods ============

    public function getImagingOrders(): array
    {
        return $this->imagingOrders;
    }

    // ============ Lab Orders Methods ============

    public function getLabOrders(): array
    {
        return $this->labOrders;
    }

    // ============ Medical Conditions Methods ============

    public function getMedicalConditions(): array
    {
        return $this->medicalConditions;
    }

    public function getMedicalCondition(int $index = 0): ?array
    {
        return $this->medicalConditions[$index] ?? null;
    }

    public function getMedicalConditionName(int $index = 0): ?string
    {
        return $this->medicalConditions[$index]['condition'] ?? null;
    }

    // ============ Physical Exam Methods ============

    public function getPhysicalExam(): array
    {
        return $this->physicalExam;
    }

    public function getPhysicalExamSystem(int $index = 0): ?string
    {
        return $this->physicalExam[$index]['system'] ?? null;
    }

    // ============ Prescription Methods ============

    public function getPrescription(): array
    {
        return $this->prescription;
    }

    // ============ Helper Methods ============

    public function hasChiefComplaints(): bool
    {
        return !empty($this->chiefComplaints);
    }

    public function hasDrugHistory(): bool
    {
        return !empty($this->drugHistory);
    }

    public function hasMedicalConditions(): bool
    {
        return !empty($this->medicalConditions);
    }

    public function getConsultation(): Consultation
    {
        return $this->consultation;
    }

    public function getSummary(): array
    {
        return [
            'consultation_uuid' => $this->consultation->consultation_uuid,
            'chief_complaints_count' => count($this->chiefComplaints),
            'drug_history_count' => count($this->drugHistory),
            'medical_conditions_count' => count($this->medicalConditions),
            'has_physical_exam' => !empty($this->physicalExam),
            'has_prescription' => !empty($this->prescription),
            'status' => $this->consultation->status,
            'submitted_at' => $this->consultation->submitted_at,
        ];
    }

    public function getChiefComplaintsSummary(): string
    {
        $complaints = array_map(function ($item) {
            return sprintf(
                '%s (Severity: %s/5, Duration: %s hrs)',
                $item['symptom'],
                $item['severity'],
                $item['duration']
            );
        }, $this->chiefComplaints);

        return implode('; ', $complaints);
    }

    public function getDrugHistorySummary(): string
    {
        $drugs = array_map(function ($item) {
            return $item['drugName'];
        }, $this->drugHistory);

        return implode(', ', $drugs);
    }

    public function getMedicalConditionsSummary(): string
    {
        $conditions = array_map(function ($item) {
            return $item['condition'];
        }, $this->medicalConditions);

        return implode(', ', $conditions);
    }
}
