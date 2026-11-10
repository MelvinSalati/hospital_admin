<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class StockIssuedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $requisitionId,
        public string $requisitionNo,
        public int $departmentId,
        public int $productId,
        public float $quantity,
        public float $remaining,
        public int $issuedBy,
        public string $rejected,
        public string $comment
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
            'type'           => 'stock_issued',
            'title'          => 'Stock issued',
            'requisition_id' => $this->requisitionId,
            'requisition_no' => $this->requisitionNo,
            'department_id'  => $this->departmentId,
            'product_id'     => $this->productId,
            'quantity'       => $this->quantity,
            'remaining'      => $this->remaining,
            'issued_by'      => $this->issuedBy,
            'message'        => sprintf(
                '%s units issued on %s. %s remaining.',
                $this->quantity,
                $this->requisitionNo,
                $this->remaining > 0 ? $this->remaining : 'Fully fulfilled'
            ),
            'url'            => "/requisitions/{$this->requisitionId}",
        ];
    }
}
