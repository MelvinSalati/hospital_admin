<?php

namespace App\Repositories\Receptions;

use App\Models\Patients\Interaction;
use Carbon\Carbon;

class ReceptionRepository
{
    public function dashboard(){
        return $this->mapDashboardMetrics();
    } 

    protected function mapDashboardMetrics() : array { 
        $today      =  Carbon::now()->format("Y-m-d");
        return [
            'total_patients'  => Interaction::where('created_at', $today)->count(),
            'dashboard' => Interaction::where('created_at', $today)->count(),
            'attendance' => Interaction::where('created_at', $today)->count()
        ];
    }
}
