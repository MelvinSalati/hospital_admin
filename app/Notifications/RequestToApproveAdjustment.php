<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequestToApproveAdjustment extends Notification implements ShouldQueue
{
    use Queueable;

    private $adjustmentNumber;
    private $requester;
    private $adjustment;
    private $adjustmentId;

    /**
     * Create a new notification instance.
     */
    public function __construct($adjustment)
    {
        $this->adjustmentNumber = $adjustment->adjustment_number ?? 'N/A';
        $this->requester = $adjustment->user->name ?? 'Unknown User';
        $this->adjustment = $adjustment;
        $this->adjustmentId = $adjustment->id ?? null;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the database representation of the notification.
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => 'Stock Adjustment Approval Required',
            'message' => "Stock adjustment #{$this->adjustmentNumber} has been submitted by {$this->requester} and is awaiting your approval.",
            'type' => 'info',
            'adjustment_id' => $this->adjustmentId,
            'adjustment_number' => $this->adjustmentNumber,
            'requester' => $this->requester,
            'url' => route('adjustments.show', $this->adjustmentId),
        ];
    }

    /**
     * Get the broadcast representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id,
            'title' => 'Stock Adjustment Approval Required',
            'message' => "Stock adjustment #{$this->adjustmentNumber} has been submitted by {$this->requester} and is awaiting your approval.",
            'type' => 'info',
            'adjustment_id' => $this->adjustmentId,
            'adjustment_number' => $this->adjustmentNumber,
            'requester' => $this->requester,
            'url' => route('adjustments.show', $this->adjustmentId),
            'created_at' => now()->toISOString(),
        ]);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Stock Adjustment Approval Required')
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line("Stock adjustment #{$this->adjustmentNumber} has been submitted by {$this->requester} and is awaiting your approval.")
            ->action('View Adjustment', route('adjustments.show', $this->adjustmentId))
            ->line('Please review and take appropriate action.');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Stock Adjustment Approval Required',
            'message' => "Stock adjustment #{$this->adjustmentNumber} has been submitted by {$this->requester} and is awaiting your approval.",
            'type' => 'info',
            'adjustment_id' => $this->adjustmentId,
            'adjustment_number' => $this->adjustmentNumber,
        ];
    }
}