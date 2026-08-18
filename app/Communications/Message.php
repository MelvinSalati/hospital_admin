<?php

namespace App\Communications;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Message
{
    /**
     * API configuration
     */
    protected string $apiKey;
    protected string $apiUrl;
    protected string $instance;

    /**
     * Channel configurations
     */
    protected array $channels = ['sms', 'whatsapp', 'email', 'telegram'];

    /**
     * Default timeout for API requests
     */
    protected int $timeout = 30;

    /**
     * Maximum retry attempts
     */
    protected int $maxRetries = 3;

    /**
     * Create a new message instance.
     */
    public function __construct()
    {
        $this->apiKey = env('ELLO_API_KEY', 'vcoYFtHXh0Ooj7jFj6EVEAOY34swPkBH');
        $this->apiUrl = env('ELLO_API_URL', 'https://wat-api.agricapito.com');
        $this->instance = env('ELLO_INSTANCE', 'ello');
        $this->validateConfiguration();
    }

    /**
     * Validate that required configuration is present
     */
    protected function validateConfiguration(): void
    {
        if (empty($this->apiKey)) {
            Log::error('Ello API key is not configured');
            throw new \RuntimeException('Ello API key is not configured');
        }

        if (empty($this->apiUrl)) {
            Log::error('Ello API URL is not configured');
            throw new \RuntimeException('Ello API URL is not configured');
        }
    }

    /**
     * Send message via specified channel
     */
    public function sendVia(string $channel, string $phoneNumber, string $message, array $options = []): array
    {
        // Validate channel
        if (!in_array($channel, $this->channels)) {
            Log::warning("Unsupported channel: {$channel}", [
                'supported_channels' => $this->channels
            ]);
            return $this->errorResponse("Channel '{$channel}' is not supported");
        }

        // Validate phone number
        if (!$this->validatePhoneNumber($phoneNumber)) {
            Log::warning("Invalid phone number: {$phoneNumber}");
            return $this->errorResponse("Invalid phone number format");
        }

        // Validate message
        if (empty($message)) {
            Log::warning("Empty message content");
            return $this->errorResponse("Message content cannot be empty");
        }

        try {
            return match ($channel) {
                'sms' => $this->sendSms($phoneNumber, $message, $options),
                'whatsapp' => $this->sendWhatsApp($phoneNumber, $message, $options),
                'email' => $this->sendEmail($phoneNumber, $message, $options),
                'telegram' => $this->sendTelegram($phoneNumber, $message, $options),
                default => $this->errorResponse("Unsupported channel: {$channel}"),
            };
        } catch (\Exception $e) {
            Log::error("Failed to send {$channel} message", [
                'phone' => $phoneNumber,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Send WhatsApp message using Evolution API
     * Evolution API endpoints:
     * - /message/sendText/{instance} - for text messages
     * - /message/sendMedia/{instance} - for media messages
     */
    protected function sendWhatsApp(string $phoneNumber, string $message, array $options = []): array
    {
        $formattedNumber = $this->formatPhoneNumber($phoneNumber);

        // Check if it's a media message
        if (isset($options['media_url'])) {
            $payload = [
                'number' => $formattedNumber,
                'mediatype' => $options['media_type'] ?? 'image',
                'media' => $options['media_url'],
                'caption' => $options['caption'] ?? $message,
                'delay' => $options['delay'] ?? 1200,
            ];

            if (isset($options['filename'])) {
                $payload['filename'] = $options['filename'];
            }

            $response = $this->makeRequest("/message/sendMedia/{$this->instance}", $payload);
        } else {
            // Text message
            $payload = [
                'number' => $formattedNumber,
                'text' => $message,
                'delay' => $options['delay'] ?? 1200,
            ];

            // Add optional options
            if (isset($options['linkPreview'])) {
                $payload['linkPreview'] = $options['linkPreview'];
            }

            $response = $this->makeRequest("/message/sendText/{$this->instance}", $payload);
        }

        if ($response->successful()) {
            Log::info("WhatsApp message sent successfully", [
                'phone' => $phoneNumber,
                'response' => $response->json()
            ]);

            return $this->successResponse('WhatsApp message sent successfully', $response->json());
        }

        $this->logApiError('WhatsApp', $phoneNumber, $response);
        return $this->errorResponse('Failed to send WhatsApp message');
    }

    /**
     * Send SMS message using Evolution API
     * Endpoint: /message/sendSms/{instance}
     */
    protected function sendSms(string $phoneNumber, string $message, array $options = []): array
    {
        $formattedNumber = $this->formatPhoneNumber($phoneNumber);

        $payload = [
            'number' => $formattedNumber,
            'text' => $message,
            'delay' => $options['delay'] ?? 1200,
        ];

        $response = $this->makeRequest("/message/sendSms/{$this->instance}", $payload);

        if ($response->successful()) {
            Log::info("SMS sent successfully", [
                'phone' => $phoneNumber,
                'response' => $response->json()
            ]);

            return $this->successResponse('SMS sent successfully', $response->json());
        }

        $this->logApiError('SMS', $phoneNumber, $response);
        return $this->errorResponse('Failed to send SMS');
    }

    /**
     * Send Email
     */
    protected function sendEmail(string $email, string $message, array $options = []): array
    {
        try {
            \Mail::raw($message, function ($mail) use ($email, $options) {
                $mail->to($email)
                    ->subject($options['subject'] ?? 'Notification')
                    ->from(config('mail.from.address'), config('mail.from.name'));

                if (isset($options['attachments'])) {
                    foreach ($options['attachments'] as $attachment) {
                        $mail->attach($attachment['path'], [
                            'as' => $attachment['name'] ?? null,
                            'mime' => $attachment['mime'] ?? null,
                        ]);
                    }
                }
            });

            Log::info("Email sent successfully", ['email' => $email]);
            return $this->successResponse('Email sent successfully');
        } catch (\Exception $e) {
            Log::error("Failed to send email", [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse('Failed to send email');
        }
    }

    /**
     * Send Telegram message
     */
    protected function sendTelegram(string $chatId, string $message, array $options = []): array
    {
        $botToken = config('services.telegram.bot_token');

        if (empty($botToken)) {
            Log::error('Telegram bot token not configured');
            return $this->errorResponse('Telegram bot token not configured');
        }

        $url = "https://api.telegram.org/bot{$botToken}/sendMessage";

        $payload = [
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => $options['parse_mode'] ?? 'HTML',
        ];

        $response = Http::timeout($this->timeout)
            ->retry($this->maxRetries, 100)
            ->post($url, $payload);

        if ($response->successful()) {
            Log::info("Telegram message sent successfully", [
                'chat_id' => $chatId,
                'response' => $response->json()
            ]);

            return $this->successResponse('Telegram message sent successfully', $response->json());
        }

        $this->logApiError('Telegram', $chatId, $response);
        return $this->errorResponse('Failed to send Telegram message');
    }

    /**
     * Make HTTP request to Evolution API
     */
    protected function makeRequest(string $endpoint, array $payload): \Illuminate\Http\Client\Response
    {
        $url = rtrim($this->apiUrl, '/') . '/' . ltrim($endpoint, '/');

        Log::debug('Evolution API Request', [
            'url' => $url,
            'payload' => $payload
        ]);

        return Http::timeout($this->timeout)
            ->retry($this->maxRetries, 100)
            ->withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->post($url, $payload);
    }

    /**
     * Format phone number for API
     */
    protected function formatPhoneNumber(string $phoneNumber): string
    {
        // Remove any non-numeric characters
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);

        // If starts with 0, remove it
        if (str_starts_with($phoneNumber, '0')) {
            $phoneNumber = substr($phoneNumber, 1);
        }

        // If doesn't start with country code, add 260 (Zambia)
        if (!str_starts_with($phoneNumber, '260')) {
            $phoneNumber = '260' . $phoneNumber;
        }

        return $phoneNumber;
    }

    /**
     * Validate phone number
     */
    protected function validatePhoneNumber(string $phoneNumber): bool
    {
        // Remove spaces and special characters
        $phoneNumber = preg_replace('/[^0-9+]/', '', $phoneNumber);

        // Check if it's a valid phone number (Zambia format: 260XXXXXXXXX)
        return (bool) preg_match('/^(\+?260|0)[0-9]{9}$/', $phoneNumber);
    }

    /**
     * Log API errors
     */
    protected function logApiError(string $channel, string $recipient, $response): void
    {
        Log::error("Failed to send {$channel} message", [
            'phone' => $recipient,
            'error' => "HTTP request returned status code {$response->status()}: " . $response->body(),
        ]);
    }

    /**
     * Create success response
     */
    protected function successResponse(string $message, array $data = []): array
    {
        return [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * Create error response
     */
    protected function errorResponse(string $message, array $errors = []): array
    {
        return [
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * Set timeout
     */
    public function setTimeout(int $seconds): self
    {
        $this->timeout = $seconds;
        return $this;
    }

    /**
     * Set max retries
     */
    public function setMaxRetries(int $retries): self
    {
        $this->maxRetries = $retries;
        return $this;
    }

    /**
     * Get supported channels
     */
    public function getSupportedChannels(): array
    {
        return $this->channels;
    }

    /**
     * Send OTP via WhatsApp (convenience method)
     */
    public function sendOTP(string $phoneNumber, string $otp): array
    {
        $message = "Your verification code is: {$otp}\n\nThis code will expire in 15 minutes.";
        return $this->sendVia('whatsapp', $phoneNumber, $message);
    }

    /**
     * Send OTP via SMS (convenience method)
     */
    public function sendOTPSMS(string $phoneNumber, string $otp): array
    {
        $message = "Your verification code is: {$otp}";
        return $this->sendVia('sms', $phoneNumber, $message);
    }
}
