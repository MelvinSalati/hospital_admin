<?php

namespace App\Jobs;

use App\Services\Messaging\ElloWhatsAppService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendGRNApprovalAlertJob implements ShouldQueue
{
    use Queueable;

    protected $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    private function generateApprovalUrl(): string
    {
        $baseUrl = config('app.url');
        $grnUuid = $this->data['grn_uuid'] ?? null;

        if ($grnUuid) {
            return $baseUrl . '/grn/authorize/' . $grnUuid;
        }

        $grnId = $this->data['grn_id'] ?? null;
        if ($grnId) {
            return $baseUrl . '/grn/authorize/' . $grnId;
        }

        return $baseUrl . '/grn';
    }

    private function buildWhatsAppMessage(): string
    {
        $grnNumber = $this->data['grn_number'] ?? 'N/A';
        $userName = $this->data['user_name'] ?? 'User';
        $approvalUrl = $this->generateApprovalUrl();

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
     * Generate QR code for the GRN approval URL
     */
    private function generateQRCode(): ?string
    {
        try {
            $url = $this->generateApprovalUrl();

            // Using Google Charts API for QR code
            $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' . urlencode($url);

            return $qrCodeUrl;
        } catch (\Exception $e) {
            Log::error('Failed to generate QR code', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    public function handle(): void
    {
        $mobileNumber = $this->data['mobile_phone_number'] ?? null;

        if (!$mobileNumber) {
            Log::warning('No mobile number provided for GRN approval', [
                'grn_number' => $this->data['grn_number'] ?? 'N/A'
            ]);
            return;
        }

        try {
            $whatsappService = new ElloWhatsAppService();

            // Send text message
            $message = $this->buildWhatsAppMessage();
            $whatsappService->sendText($mobileNumber, $message);

            // Optional: Send QR code image
            $qrCodeUrl = $this->generateQRCode();
            if ($qrCodeUrl) {
                $whatsappService->sendImage(
                    $mobileNumber,
                    $qrCodeUrl,
                    'Scan this QR code to approve the GRN'
                );
            }

            Log::info('GRN approval WhatsApp message sent successfully', [
                'grn_number' => $this->data['grn_number'] ?? 'N/A',
                'recipient' => $mobileNumber
            ]);
        } catch (\Exception $e) {
            Log::error('Error sending GRN approval WhatsApp message', [
                'grn_number' => $this->data['grn_number'] ?? 'N/A',
                'recipient' => $mobileNumber,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }
}
