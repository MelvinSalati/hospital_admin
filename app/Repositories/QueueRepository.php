<?php

namespace App\Repositories;

use App\Models\Department;
use App\Models\PatientVisit as Queue;
use App\Repositories\PatientRepository;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class QueueRepository
{
    protected $queueModel;
    protected $patientRepository;

    /**
     * Create a new class instance.
     */
    public function __construct(Queue $queueModel, PatientRepository $patientRepository)
    {
        $this->queueModel        =  $queueModel;
        $this->patientRepository =  $patientRepository;
    }

    private function getPatientId($patientIdentification){
        return $this->patientRepository->getPatientId($patientIdentification);
    }

    private function updateQueueStatus($patientId){
        return $this->queueModel->where('patient_id', $patientId)->where('status',1)->update(["status" => 0]);

    }

    private function visitType($visitType){
        if($visitType==='1'){
            return "new";
        } else {
            return "revisit";
        }
    }

    public function isExist($patientId, $departmentId){
       return $this->queueModel
       ->where('patient_id', $patientId)
       ->where('department_id',$departmentId)
       ->where('status',1)
       ->exists();
    }

    public function create(array $data){
        $patientId         =  $this->getPatientId($data['patient_number']);


    if(!$this->isExist($patientId,$data['department_id'])){
            $this->updateQueueStatus($patientId);
            $create = $this->queueModel->create([
                'visit_token'   => '',
                'patient_id'    => $patientId,
                'visit_uuid'    => Str::uuid(),
                'created_by'    => Auth::id(),
                'visit_type'    => $this->visitType($data['visit_type']),
                'department_id' => $data['department_id'],
                'token'         => rand(000000, 999999),
                'to_queue'      => $data['staff_id'],
                'priority'      => $data['priority'],
                'status'        => 1
            ]);
            return $create;
    } else {
        return false;
    }

    }

    public function getQueue(int $departmentId)
    {
        return $this->queueModel->join('patients', 'patients.id', '=', 'patient_visits.patient_id')
            ->where('department_id', $departmentId)
            ->where('patient_visits.status', 1)
            ->select('*')
            ->get();
    }
}
