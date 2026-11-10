<?php

namespace App\Events;

use App\Models\Patients\ImagingOrder;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ImagingOrderCreated implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(public ImagingOrder $order) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('department.5')];
    }

    public function broadcastWith(): array
    {
        return [
            'id'          => $this->order->id,
            'orderNumber' => $this->order->order_number,
            'patientName' => $this->order->patient?->name ?? 'Unknown',
            'test'        => trim(($this->order->modality ?? '') . ' ' . ($this->order->body_part ?? '')),
            'priority'    => $this->order->priority,
            'message'     => 'New imaging order received!',
        ];
    }
}
