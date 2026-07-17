<?php
// app/Services/ReportService.php

namespace App\Services;

use App\Repositories\ReportRepository;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ReportService extends BaseService
{
    protected $reportRepository;

    public function __construct(ReportRepository $reportRepository)
    {
        parent::__construct($reportRepository);
        $this->reportRepository = $reportRepository;
    }

    /**
     * Get financial report
     */
    public function getFinancialReport(array $data)
    {
        $validator = Validator::make($data, [
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'group_by' => 'nullable|in:day,month,payment_method,department'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $this->reportRepository->getFinancialReport(
            $data['from_date'],
            $data['to_date'],
            $data['group_by'] ?? 'day'
        );
    }

    /**
     * Get patient report
     */
    public function getPatientReport(array $data = [])
    {
        $validator = Validator::make($data, [
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $this->reportRepository->getPatientReport(
            $data['from_date'] ?? null,
            $data['to_date'] ?? null
        );
    }

    /**
     * Get inventory report
     */
    public function getInventoryReport()
    {
        return $this->reportRepository->getInventoryReport();
    }

    /**
     * Get laboratory report
     */
    public function getLaboratoryReport(array $data)
    {
        $validator = Validator::make($data, [
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $this->reportRepository->getLaboratoryReport(
            $data['from_date'],
            $data['to_date']
        );
    }

    /**
     * Get radiology report
     */
    public function getRadiologyReport(array $data)
    {
        $validator = Validator::make($data, [
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $this->reportRepository->getRadiologyReport(
            $data['from_date'],
            $data['to_date']
        );
    }

    /**
     * Get doctors performance report
     */
    public function getDoctorsReport(array $data)
    {
        $validator = Validator::make($data, [
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'doctor_id' => 'nullable|integer|exists:users,id'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $this->reportRepository->getDoctorsReport(
            $data['from_date'],
            $data['to_date'],
            $data['doctor_id'] ?? null
        );
    }

    /**
     * Get dashboard metrics
     */
    public function getDashboardMetrics()
    {
        return $this->reportRepository->getDashboardMetrics();
    }

    /**
     * Export report
     */
    public function exportReport($type, $format, $params = [])
    {
        // Get report data
        switch ($type) {
            case 'financial':
                $data = $this->getFinancialReport($params);
                break;
            case 'patients':
                $data = $this->getPatientReport($params);
                break;
            case 'inventory':
                $data = $this->getInventoryReport();
                break;
            case 'laboratory':
                $data = $this->getLaboratoryReport($params);
                break;
            case 'radiology':
                $data = $this->getRadiologyReport($params);
                break;
            case 'doctors':
                $data = $this->getDoctorsReport($params);
                break;
            default:
                throw new \Exception('Invalid report type');
        }

        // Generate file based on format
        $fileName = $type . '_report_' . date('YmdHis') . '.' . $format;

        // Here you would implement PDF/Excel/CSV generation
        // using packages like dompdf, maatwebsite/excel, etc.

        return [
            'data' => $data,
            'file_name' => $fileName,
            'format' => $format
        ];
    }
}
