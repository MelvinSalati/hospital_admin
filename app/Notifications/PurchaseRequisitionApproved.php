<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PurchaseRequisitionApproved extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $requisitionId,
        public string $requisitionNo,
        public string $departmentName,
        public float $totalAmount,
        public string $budgetCode,
        public int $itemCount,
        public int $approvedBy,
        public string $approvedByName,
        public string $approvedAt,
        public ?string $comments = null,
    ) {
        $this->onQueue('notifications');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'             => 'purchase_requisition_approved',
            'title'            => 'Requisition approved',
            'requisition_id'   => $this->requisitionId,
            'requisition_no'   => $this->requisitionNo,
            'department_name'  => $this->departmentName,
            'total_amount'     => $this->totalAmount,
            'budget_code'      => $this->budgetCode,
            'item_count'       => $this->itemCount,
            'approved_by'      => $this->approvedBy,
            'approved_by_name' => $this->approvedByName,
            'approved_at'      => $this->approvedAt,
            'comments'         => $this->comments,
            'message'          => sprintf(
                'Your requisition %s (%d item(s), total %s) was approved by %s.',
                $this->requisitionNo,
                $this->itemCount,
                number_format($this->totalAmount, 2),
                $this->approvedByName,
            ),
            'url'              => "/admin/purchase-requisitions/{$this->requisitionId}",
        ];
    }
}
