<?php

namespace App\Services\ReportsService;

use App\Repositories\ReportRepository;

class ReportService
{
    protected ReportRepository $reportRepsoitory;

    /**
     * Create a new class instance.
     */
    public function __construct(ReportRepository $reportRepository)
    {
        $this->reportRepository = $reportRepository;
    } 

    public function getReport(array $reportParameters){

        $reportName     =  $reportParamters['name'];
        $to = $reportParamters ['to'];
        $from = $reportParamters ['from'];

        switch($reportName){
            case 'cash-payment':
                $report = $this->period($from, $to, $departmentId);
                break;
            case 'insurance':
                $report = $this->period($from, $to, $departmentId);;
                break;
            case 'attendance':
                $report = $this->period($from, $to, $departmentId);
            default:
            break

        }
    }

    
}
