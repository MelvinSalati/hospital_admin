<?php

namespace App\Jobs;

use App\Helpers\NumberGenerator;
use Faker\Core\Number;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
class SendOtpJob implements ShouldQueue
{
    use Queueable;

    protected $message;
    protected $phoneNumber;

    /**
     * Create a new job instance.
     */
    public function __construct($message, $phoneNumber)
    {
        $this->message = $message;
        $this->phoneNumber = $phoneNumber;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Send via WhatsApp
            $message = new \App\Communications\Message();
            $result = $message->sendVia(
                'whatsapp', // Channel
                $this->phoneNumber, // Recipient
                $this->message
            );

            // Check if sent successfully
            if ($result['success']) {
            
            } else {
                // Fallback to SMS if WhatsApp fails
                Log::warning('WhatsApp failed, falling back to SMS', [
                    'grn_id' => '---',
                    'phone' => $this->phoneNumber
                ]);

                $result = $message->sendVia(
                    'sms',
                    $this->phoneNumber,
                    "Your GRN approval code is: "
                );

                if (!$result['success']) {
                    throw new \Exception('Failed to send OTP via both WhatsApp and SMS');
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send OTP', [
                'grn_id' => '' ?? null,
                'phone' => $this->phoneNumber ?? null,
                'error' => $e->getMessage()
            ]);

            // You might want to throw or handle differently
            throw $e;
        }
    }
}
