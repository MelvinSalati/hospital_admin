<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PurchaseRequestApproval extends Notification implements ShouldQueue
{
    use Queueable;

    protected $purchaseRequisition;
    protected $action;
    protected $approverName;
    protected $notificationData;

    /**
     * Create a new notification instance.
     */
    public function __construct($purchaseRequisition, $action, $approverName)
    {
        $this->purchaseRequisition = $purchaseRequisition;
        $this->action = $action;
        $this->approverName = $approverName;
        $this->notificationData = $this->buildNotificationData();
    }

    /**
     * Build notification data with null safety.
     */
    protected function buildNotificationData(): array
    {
        // ✅ Safely get requester name with null checks
        $requesterName = 'Unknown User';
        if ($this->purchaseRequisition && isset($this->purchaseRequisition->requester)) {
            $requesterName = $this->purchaseRequisition->requester ?? 'Unknown User';
        }
        
        // ✅ Safely get department name
        $departmentName = 'N/A';
        if ($this->purchaseRequisition && isset($this->purchaseRequisition->department)) {
            $departmentName = $this->purchaseRequisition->department->name ?? 'N/A';
        }

        // ✅ Safely get PR number
        $prNumber = $this->purchaseRequisition->pr_number ?? 'N/A';
        
        // ✅ Safely get ID
        $requisitionId = $this->purchaseRequisition->id ?? null;
        
        // ✅ Safely get total amount
        $totalAmount = $this->purchaseRequisition->total_amount ?? 0;
        
        // ✅ Safely get priority
        $priority = $this->purchaseRequisition->priority ?? 'medium';
        
        // ✅ Safely get status
        $status = $this->purchaseRequisition->status ?? 'pending';

        $data = [
            'requisition_id' => $requisitionId,
            'pr_number' => $prNumber,
            'total_amount' => $totalAmount,
            'department' => $departmentName,
            'requester' => $requesterName,
            'priority' => $priority,
            'status' => $status,
        ];

        // ✅ Build URL safely
        if ($requisitionId) {
            try {
                $data['url'] = route('requisitions.show', $requisitionId);
            } catch (\Exception $e) {
                $data['url'] = null;
            }
        } else {
            $data['url'] = null;
        }

        // ✅ Handle different actions
        switch ($this->action) {
            case 'supervisor_approval':
                $data['title'] = '📋 Requisition Needs Your Approval';
                $data['message'] = "PR #{$prNumber} from {$requesterName} needs your approval as supervisor.";
                $data['type'] = 'supervisor_approval';
                $data['status'] = 'pending_supervisor';
                break;

            case 'supervisor_approved':
                $data['title'] = '✅ Supervisor Approved';
                $data['message'] = "PR #{$prNumber} has been approved by supervisor {$this->approverName}.";
                $data['type'] = 'supervisor_approved';
                $data['status'] = 'supervisor_approved';
                break;

            case 'admin_approval':
                $data['title'] = '💰 Funds Release Required';
                $data['message'] = "PR #{$prNumber} has been approved by supervisor and needs admin approval/funds release.";
                $data['type'] = 'admin_approval';
                $data['status'] = 'pending_admin';
                break;

            case 'admin_approved':
                $data['title'] = '✅ Requisition Approved';
                $data['message'] = "PR #{$prNumber} has been fully approved by admin {$this->approverName}.";
                $data['type'] = 'success';
                $data['status'] = 'approved';
                break;

            case 'funds_released':
                $data['title'] = '💰 Funds Released';
                $data['message'] = "Funds for PR #{$prNumber} have been released by admin {$this->approverName}.";
                $data['type'] = 'funds_released';
                $data['status'] = 'funds_released';
                break;

            case 'rejected':
                $data['title'] = '❌ Requisition Rejected';
                $data['message'] = "PR #{$prNumber} has been rejected by {$this->approverName}.";
                $data['type'] = 'rejected';
                $data['status'] = 'rejected';
                $data['rejection_reason'] = $this->purchaseRequisition->rejection_reason ?? 'No reason provided';
                break;

            default:
                $data['title'] = 'Purchase Requisition Update';
                $data['message'] = "PR #{$prNumber} has been updated.";
                $data['type'] = 'info';
                $data['status'] = $status;
        }

        return $data;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the database representation.
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->notificationData;
    }

    /**
     * Get the broadcast representation.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        $data = $this->notificationData;
        $data['id'] = $this->id ?? null;
        $data['sent_at'] = now()->toISOString();
        
        return new BroadcastMessage($data);
    }

    /**
     * Get the mail representation.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $data = $this->notificationData;
        $subject = $data['title'] ?? 'Purchase Requisition Update';
        
        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("Hello {$notifiable->name}!");

        if (isset($data['message'])) {
            $mail->line($data['message']);
        }

        if (isset($data['url']) && $data['url']) {
            $mail->action('View Requisition', $data['url']);
        }

        return $mail->line('Thank you for using our application!');
    }

    /**
     * Get the array representation.
     */
    public function toArray(object $notifiable): array
    {
        return $this->notificationData;
    }
}