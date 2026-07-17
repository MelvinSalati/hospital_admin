<?php

namespace App\Events;

use App\Models\BulkStoreRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderBulkStoreProduct implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $order;
    public $orderItems;
    public $departmentName;
    public $priority;
    public $timestamp;

    /**
     * Create a new event instance.
     */
    public function __construct(BulkStoreRequest $order)
    {
        $this->order = $order;
        $this->orderItems = $order->items()->with('product')->get();
        $this->departmentName = $order->department?->name ?? 'Unknown Department';
        $this->priority = $order->priority;
        $this->timestamp = now()->toDateTimeString();
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            // Private channel for specific department
            new PrivateChannel('bulk-store.' . $this->order->department_id),
            // Private channel for all bulk store staff
            new PrivateChannel('bulk-store.orders'),
            // Public channel for general notifications
            new Channel('bulk-store.public'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'order.created';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'order_number' => $this->order->request_number,
            'department' => $this->departmentName,
            'department_id' => $this->order->department_id,
            'priority' => $this->priority,
            'priority_color' => $this->getPriorityColor(),
            'priority_label' => $this->getPriorityLabel(),
            'status' => $this->order->status,
            'status_label' => $this->getStatusLabel(),
            'total_amount' => $this->order->total_amount,
            'total_items' => $this->orderItems->count(),
            'items' => $this->orderItems->map(function ($item) {
                return [
                    'product_id' => $item->product_id,
                    'product_name' => $item->product?->drug_name ?? 'Unknown Product',
                    'product_code' => $item->product?->drug_code ?? 'N/A',
                    'quantity' => $item->quantity_requested,
                    'unit' => $item->product?->unit_of_measure ?? 'units',
                    'batch_number' => $item->batch_number,
                    'expiry_date' => $item->expiry_date ? $item->expiry_date->format('Y-m-d') : null,
                ];
            }),
            'notes' => $this->order->notes,
            'created_by' => $this->order->createdBy?->name ?? 'System',
            'created_at' => $this->order->created_at->toISOString(),
            'timestamp' => $this->timestamp,
            'time_ago' => $this->order->created_at->diffForHumans(),
        ];
    }

    /**
     * Get priority color for notification.
     */
    private function getPriorityColor(): string
    {
        return match ($this->priority) {
            'low' => 'blue',
            'medium' => 'yellow',
            'high' => 'orange',
            'urgent' => 'red',
            default => 'gray',
        };
    }

    /**
     * Get priority label for notification.
     */
    private function getPriorityLabel(): string
    {
        return match ($this->priority) {
            'low' => 'Low',
            'medium' => 'Medium',
            'high' => 'High',
            'urgent' => 'Urgent',
            default => ucfirst($this->priority),
        };
    }

    /**
     * Get status label for notification.
     */
    private function getStatusLabel(): string
    {
        return match ($this->status) {
            'draft' => 'Draft',
            'pending' => 'Pending',
            'approved' => 'Approved',
            'dispatched' => 'Dispatched',
            'partial' => 'Partial',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            default => ucfirst($this->status),
        };
    }

    /**
     * Determine if this event should broadcast.
     */
    public function broadcastWhen(): bool
    {
        // Only broadcast if order is active and not cancelled
        return $this->order->is_active && $this->order->status !== 'cancelled';
    }

    /**
     * Get the sockets that should be excluded from broadcasting.
     */
    public function broadcastOnExclude(): array
    {
        // Exclude the user who created the order from receiving their own notification
        return [
            'App.Models.User.' . $this->order->created_by,
        ];
    }
}
