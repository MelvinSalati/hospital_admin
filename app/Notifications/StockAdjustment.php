<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StockAdjustment extends Notification implements ShouldQueue
{
    use Queueable;

    protected $adjustment;
    protected $action;
    protected $performerName;
    protected $notificationData;

    /**
     * Create a new notification instance.
     */
    public function __construct($adjustment, $action, $performerName = null)
    {
        $this->adjustment = $adjustment;
        $this->action = $action;
        $this->performerName = $performerName ?? 'System';
        $this->notificationData = $this->buildNotificationData();
    }

    /**
     * Build notification data with null safety.
     */
    protected function buildNotificationData(): array
    {
        // ✅ Safely get product details
        $productName = 'Unknown Product';
        $productCode = 'N/A';
        
        if ($this->adjustment && isset($this->adjustment->product)) {
            $productName = $this->adjustment->product->name ?? 'Unknown Product';
            $productCode = $this->adjustment->product->sku ?? 'N/A';
        }

        // ✅ Safely get department name
        $departmentName = 'N/A';
        if ($this->adjustment && isset($this->adjustment->department)) {
            $departmentName = $this->adjustment->department->name ?? 'N/A';
        }

        // ✅ Safely get adjustment details
        $adjustmentNumber = $this->adjustment->adjustment_number ?? $this->adjustment->reference_number ?? 'N/A';
        $adjustmentId = $this->adjustment->id ?? null;
        $quantity = $this->adjustment->quantity ?? 0;
        $difference = $this->adjustment->difference ?? $this->adjustment->adjustment_difference ?? 0;
        $reason = $this->adjustment->reason ?? $this->adjustment->remarks ?? 'No reason provided';
        $category = $this->adjustment->category ?? 'correction';
        $status = $this->adjustment->status ?? 'pending';
        $requestedBy = $this->adjustment->requester?->name ?? $this->adjustment->createdBy?->name ?? 'Unknown User';

        // ✅ Build URL safely
        $url = null;
        if ($adjustmentId) {
            try {
                $url = route('stock.adjustments.show', $adjustmentId);
            } catch (\Exception $e) {
                $url = null;
            }
        }

        // ✅ Determine adjustment type label
        $adjustmentTypeLabel = $difference > 0 ? 'Addition (+)' : 'Reduction (-)';
        $adjustmentTypeIcon = $difference > 0 ? '📈' : '📉';
        $direction = $difference > 0 ? 'increased' : 'decreased';

        $data = [
            'adjustment_id' => $adjustmentId,
            'adjustment_number' => $adjustmentNumber,
            'product_name' => $productName,
            'product_code' => $productCode,
            'department' => $departmentName,
            'quantity' => $quantity,
            'difference' => $difference,
            'diff_abs' => abs($difference),
            'category' => $category,
            'category_label' => $this->getCategoryLabel($category),
            'reason' => $reason,
            'status' => $status,
            'status_label' => $this->getStatusLabel($status),
            'requested_by' => $requestedBy,
            'url' => $url,
            'adjustment_type_label' => $adjustmentTypeLabel,
            'adjustment_type_icon' => $adjustmentTypeIcon,
            'direction' => $direction,
        ];

        // ✅ Handle different actions
        switch ($this->action) {
            case 'submitted':
                $data['title'] = '📋 Stock Adjustment Submitted';
                $data['message'] = "Adjustment #{$adjustmentNumber} for {$productName} has been submitted for approval.";
                $data['type'] = 'submitted';
                $data['status'] = 'pending';
                break;

            case 'approved':
                $data['title'] = '✅ Stock Adjustment Approved';
                $data['message'] = "Adjustment #{$adjustmentNumber} for {$productName} has been approved by {$this->performerName}.";
                $data['type'] = 'approved';
                $data['status'] = 'approved';
                break;

            case 'rejected':
                $data['title'] = '❌ Stock Adjustment Rejected';
                $data['message'] = "Adjustment #{$adjustmentNumber} for {$productName} has been rejected by {$this->performerName}.";
                $data['type'] = 'rejected';
                $data['status'] = 'rejected';
                $data['rejection_reason'] = $this->adjustment->rejection_reason ?? 'No reason provided';
                break;

            case 'applied':
                $data['title'] = '✅ Stock Adjustment Applied';
                $data['message'] = "Adjustment #{$adjustmentNumber} for {$productName} has been applied. Stock {$direction} by " . abs($difference) . " units.";
                $data['type'] = 'applied';
                $data['status'] = 'applied';
                break;

            case 'cancelled':
                $data['title'] = '🚫 Stock Adjustment Cancelled';
                $data['message'] = "Adjustment #{$adjustmentNumber} for {$productName} has been cancelled by {$this->performerName}.";
                $data['type'] = 'cancelled';
                $data['status'] = 'cancelled';
                break;

            case 'needs_approval':
                $data['title'] = '⚠️ Stock Adjustment Needs Approval';
                $data['message'] = "Adjustment #{$adjustmentNumber} for {$productName} requires your approval.";
                $data['type'] = 'needs_approval';
                $data['status'] = 'pending';
                $data['requires_action'] = true;
                break;

            case 'auto_approved':
                $data['title'] = '✅ Stock Adjustment Auto-Approved';
                $data['message'] = "Adjustment #{$adjustmentNumber} for {$productName} was auto-approved (small positive adjustment).";
                $data['type'] = 'auto_approved';
                $data['status'] = 'approved';
                break;

            default:
                $data['title'] = 'Stock Adjustment Update';
                $data['message'] = "Adjustment #{$adjustmentNumber} for {$productName} has been updated.";
                $data['type'] = 'info';
                $data['status'] = $status;
        }

        return $data;
    }

    /**
     * Get category label
     */
    protected function getCategoryLabel(string $category): string
    {
        $labels = [
            'correction' => 'Correction',
            'damage' => 'Damage',
            'expiry' => 'Expiry',
            'shortage' => 'Shortage',
            'surplus' => 'Surplus',
            'quality_issue' => 'Quality Issue',
            'theft' => 'Theft',
            'return_supplier' => 'Return to Supplier',
            'return_customer' => 'Customer Return',
        ];
        
        return $labels[$category] ?? $category;
    }

    /**
     * Get status label
     */
    protected function getStatusLabel(string $status): string
    {
        $labels = [
            'draft' => 'Draft',
            'pending' => 'Pending Approval',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'cancelled' => 'Cancelled',
            'applied' => 'Applied',
        ];
        
        return $labels[$status] ?? $status;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast', 'mail'];
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
        $subject = $data['title'] ?? 'Stock Adjustment Update';
        
        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("Hello {$notifiable->name}!");

        // Add context lines
        $mail->line($data['message'] ?? '');
        
        if (isset($data['product_name'])) {
            $mail->line("**Product:** {$data['product_name']}");
        }
        
        if (isset($data['product_code'])) {
            $mail->line("**Product Code:** {$data['product_code']}");
        }
        
        if (isset($data['adjustment_number'])) {
            $mail->line("**Adjustment #:** {$data['adjustment_number']}");
        }
        
        if (isset($data['department'])) {
            $mail->line("**Department:** {$data['department']}");
        }
        
        if (isset($data['difference'])) {
            $mail->line("**Change:** {$data['adjustment_type_icon']} " . abs($data['difference']) . " units ({$data['adjustment_type_label']})");
        }
        
        if (isset($data['category_label'])) {
            $mail->line("**Category:** {$data['category_label']}");
        }
        
        if (isset($data['reason'])) {
            $mail->line("**Reason:** {$data['reason']}");
        }

        if (isset($data['rejection_reason'])) {
            $mail->line("**Rejection Reason:** {$data['rejection_reason']}");
        }

        if (isset($data['url']) && $data['url']) {
            $mail->action('View Adjustment', $data['url']);
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