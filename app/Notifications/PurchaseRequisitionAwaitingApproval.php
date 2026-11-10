<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PurchaseRequisitionAwaitingApproval extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $requisitionId,
        public string $requisitionNo,
        public int $departmentId,
        public string $departmentName,
        public string $priority,
        public float $totalAmount,
        public string $budgetCode,
        public int $itemCount,
        public int $requestedBy,
        public string $requestedByName,
        public ?string $requiredDate = null,
    ) {
        $this->onQueue('notifications');
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'            => 'purchase_requisition_awaiting_approval',
            'title'           => 'Requisition awaiting approval',
            'requisition_id'  => $this->requisitionId,
            'requisition_no'  => $this->requisitionNo,
            'department_id'   => $this->departmentId,
            'department_name' => $this->departmentName,
            'priority'        => $this->priority,
            'total_amount'    => $this->totalAmount,
            'budget_code'     => $this->budgetCode,
            'item_count'      => $this->itemCount,
            'requested_by'    => $this->requestedBy,
            'requested_by_name' => $this->requestedByName,
            'required_date'   => $this->requiredDate,
            'message'         => sprintf(
                '%s (%s) submitted by %s in %s — %d item(s), total %s. Priority: %s.',
                $this->requisitionNo,
                $this->priority,
                $this->requestedByName,
                $this->departmentName,
                $this->itemCount,
                number_format($this->totalAmount, 2),
                ucfirst($this->priority),
            ),
            'url'             => "/admin/purchase-requisitions/{$this->requisitionId}",
        ];
    }
}
