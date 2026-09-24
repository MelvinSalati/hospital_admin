<?php

namespace App\Repositories\Laboratories;

use App\Helpers\NumberGenerator;
use App\Models\Laboratories\Laboratory;
use App\Models\Patients\LabOrder;
use App\Models\Patients\LabOrderItem;
use Illuminate\Support\Facades\DB; 


class LaboratoryRepository
{
    protected Laboratory $laboratory;
    /**
     * Create a new class instance.
     */
    public function __construct(Laboratory $laboratory)
    {
        $this->laboratory    = $laboratory;
    }

    public function getAllLaboratoryServices(){
        return $this->laboratory->all();
    } 

    /**
     *  Create order laboratory
     *   
     */


    public function createLaboratoryOrder(array $orderDetails): array
    {
        $visitToken = $orderDetails['visit_token'];
        $patientId  = $orderDetails['patient_id'];
        $orderItems = $orderDetails['services'];

        return DB::transaction(function () use (
            $visitToken,
            $patientId,
            $orderItems
        ) {
            /**
             * Check if a laboratory order batch already exists
             * for this patient and visit.
             */
            
            $orderBatch = LabOrder::where('visit_token', $visitToken)
                ->where('patient_id', $patientId)
                ->first();

            /**
             * Create a new laboratory order batch
             * if one does not already exist.
             */
            if (!$orderBatch) {
                $orderBatch = $this->createLaboratroryOrderBatch(
                    $visitToken,
                    $patientId
                );
            }

            /**
             * Create laboratory order items.
             */
            $createdItems = [];

            foreach ($orderItems as $item) {
                $createdItems[] = LabOrderItem::create([
                    'lab_order_id'  => $orderBatch->id,
                    'order_number'  => NumberGenerator::randomCode(
                        'ODR',
                    ) ?? 00023,
                    'test_id'       => $item['test_id'] ??  $item['id'],
                    'test_name'     => $item['test_name'] ??  $item['service_name'],
                    'test_category' => $item['test_category'] ??  $item['service_category'],
                    'priority'      => $item['priority'] ?? 'routine',
                    'created_by'    => $item['created_by'] ?? 1,
                ]);
            }
            
            return $createdItems;
        });
    }


    public function createLaboratroryOrderBatch(string $visitToken, int $patientId){
        return  LabOrder::create([ 'visit_token'=> $visitToken, 'patient_id'=> $patientId ]);
    }

    public function createDashboard(){

    }
   
}
