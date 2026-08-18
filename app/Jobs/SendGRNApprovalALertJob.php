<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendGRNApprovalAlertJob implements ShouldQueue
{
    use Queueable;

    protected $data;

    /**
     * Create a new job instance.
     */
    public function __construct(array $data)
    {
        $this->data = $data;
    }

    /**
     * Generate the approval URL with GRN UUID
     */
    private function generateApprovalUrl(): string
    {
        $baseUrl = config('app.url');
        $grnUuid = $this->data['grn_uuid'] ?? null;

        if ($grnUuid) {
            return $baseUrl . '/grn/authorize/' . $grnUuid;
        }

        // Fallback to using grn_id if UUID is not available
        $grnId = $this->data['grn_id'] ?? null;
        if ($grnId) {
            return $baseUrl . '/grn/authorize/' . $grnId;
        }

        return $baseUrl . '/grn';
    }

    /**
     * Build WhatsApp message with approval link
     */
    private function buildWhatsAppMessage(): string
    {
        $grnNumber = $this->data['grn_number'] ?? 'N/A';
        $userName = $this->data['user_name'] ?? 'User';
        $approvalUrl = $this->generateApprovalUrl();

        // Build the message
        $message = "📋 *GRN APPROVAL REQUIRED*\n\n";
        $message .= "Dear *{$userName}*,\n\n";
        $message .= "A new Goods Received Note requires your approval.\n\n";
        $message .= "📄 *GRN Number:* {$grnNumber}\n\n";

        $message .= "🔗 *Click the link below to approve:*\n";
        $message .= "{$approvalUrl}\n\n";

        $message .= "📱 *Instructions:*\n";
        $message .= "1️⃣ Click the link above\n";
        $message .= "2️⃣ Review the GRN details\n";
        $message .= "3️⃣ Click 'Approve' to authorize\n\n";

        $message .= "⏰ *This link will expire in 24 hours.*\n\n";
        $message .= "Thank you,\n";
        $message .= config('app.name') . " Team";

        return $message;
    }

    /**
     * Send WhatsApp message with approval link
     */
    private function sendWhatsAppMessage(): void
    {
        $mobileNumber = $this->data['mobile_phone_number'] ?? null;

        if (!$mobileNumber) {
            Log::warning('No mobile number provided for GRN approval', [
                'grn_number' => $this->data['grn_number'] ?? 'N/A'
            ]);
            return;
        }

        try {
            $message = $this->buildWhatsAppMessage();

            // Send via WhatsApp service
            \App\Services\WhatsAppService::sendWhatsAppMessage(
                $mobileNumber,
                $message
            );

            Log::info('GRN approval WhatsApp message sent successfully', [
                'grn_number' => $this->data['grn_number'] ?? 'N/A',
                'grn_uuid' => $this->data['grn_uuid'] ?? null,
                'recipient' => $mobileNumber
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send GRN approval WhatsApp message', [
                'grn_number' => $this->data['grn_number'] ?? 'N/A',
                'recipient' => $mobileNumber,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $this->sendWhatsAppMessage();
        } catch (\Exception $e) {
            Log::error('Error in SendGRNApprovalAlertJob', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Re-throw the exception to mark job as failed
            throw $e;
        }
    }
}
