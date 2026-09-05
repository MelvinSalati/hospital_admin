<?php

namespace App\Communications;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;
use App\Models\Communications\WhatsAppMessage;

class WhatsApp
{
    protected string $client;
    protected string $baseURL;

    public function __construct()
    {
        $this->baseURL = rtrim(env('GOWA_BASE_URL'), '/');
        $this->client = Http::withBasicAuth(env('GOWA_USERNAME'), env('GOWA_PASSWORD'))
            ->acceptJson()
            ->timeout(30)
            ->retry(3, 100);
    }

    /**
     * Format phone number to international standard
     * Removes leading 0, adds country code
     */
    protected function formatPhone(string $phone, string $countryCode = '263'): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Remove leading zeros
        $phone = ltrim($phone, '0');

        // Add country code if not present
        if (!str_starts_with($phone, $countryCode)) {
            $phone = $countryCode . $phone;
        }

        // Add + prefix
        return '+' . $phone;
    }

    /**
     * Generic request handler - single point for all API calls
     */
    protected function request(string $method, string $endpoint, array $payload = []): array
    {
        try {
            $response = $this->client->$method($this->baseURL . $endpoint, $payload);

            Log::info("WhatsApp API: {$method} {$endpoint}", ['status' => $response->status()]);

            return [
                'success' => $response->successful(),
                'status' => $response->status(),
                'data' => $response->json(),
                'raw' => $response->body()
            ];
        } catch (Exception $e) {
            Log::error("WhatsApp API failed: {$method} {$endpoint}", ['error' => $e->getMessage()]);
            return ['success' => false, 'status' => 500, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send message with tracking
     */
    public function send(string $phone, string $message, array $options = []): array
    {
        // Format phone number
        $formattedPhone = $this->formatPhone($phone, $options['country_code'] ?? '263');

        $result = $this->request('post', '/send/message', array_merge([
            'phone' => $formattedPhone,
            'message' => $message
        ], $options));

        if ($result['success'] && isset($result['data']['message_id'])) {
            $this->store(
                $result['data']['message_id'],
                $formattedPhone,
                $message,
                'outgoing',
                'sent',
                $options
            );
        }

        return $result;
    }

    // ... rest of the methods remain the same ...

    /**
     * Check message status
     */
    public function status(string $messageId): array
    {
        $result = $this->request('get', "/message/status/{$messageId}");

        if ($result['success']) {
            $this->updateStatus($messageId, $result['data']);
        }

        return $result;
    }

    /**
     * Get message details with replies
     */
    public function details(string $messageId): array
    {
        return $this->request('get', "/message/details/{$messageId}");
    }

    /**
     * Mark as read
     */
    public function read(string $messageId): array
    {
        $result = $this->request('post', '/message/read', ['message_id' => $messageId]);

        if ($result['success']) {
            $this->updateStatus($messageId, ['status' => 'read', 'read_at' => now()]);
        }

        return $result;
    }

    /**
     * Delete message
     */
    public function delete(string $messageId): array
    {
        $result = $this->request('delete', "/message/{$messageId}");

        if ($result['success']) {
            WhatsAppMessage::where('message_id', $messageId)->update([
                'deleted_at' => now(),
                'status' => 'deleted'
            ]);
        }

        return $result;
    }

    /**
     * Get conversation
     */
    public function conversation(string $phone, int $limit = 50): array
    {
        $formattedPhone = $this->formatPhone($phone);
        return $this->request('get', '/conversation', ['phone' => $formattedPhone, 'limit' => $limit]);
    }

    /**
     * Get unread messages
     */
    public function unread(?string $phone = null): array
    {
        $query = WhatsAppMessage::where('direction', 'incoming')
            ->whereNull('read_at')
            ->where('status', '!=', 'deleted');

        if ($phone) {
            $formattedPhone = $this->formatPhone($phone);
            $query->where('phone', $formattedPhone);
        }

        return ['success' => true, 'data' => $query->get()];
    }

    /**
     * Handle webhook
     */
    public function webhook(array $payload): array
    {
        Log::info('WhatsApp webhook', ['type' => array_keys($payload)]);

        if (isset($payload['message'])) $this->handleMessage($payload['message']);
        if (isset($payload['status'])) $this->handleStatus($payload['status']);
        if (isset($payload['deleted'])) $this->handleDeleted($payload['deleted']);

        return ['success' => true];
    }

    // === Internal Helpers ===

    protected function store(string $id, string $phone, string $message, string $direction, string $status, array $options = [])
    {
        WhatsAppMessage::create([
            'message_id' => $id,
            'phone' => $phone, // Already formatted
            'message' => $message,
            'direction' => $direction,
            'status' => $status,
            'type' => $options['type'] ?? 'text',
            'reference_id' => $options['reference_id'] ?? null,
            'sent_at' => $direction === 'outgoing' ? now() : null,
            'metadata' => $options['metadata'] ?? null
        ]);
    }

    protected function updateStatus(string $id, array $data)
    {
        $message = WhatsAppMessage::where('message_id', $id)->first();
        if (!$message) return;

        $updates = ['status' => $data['status'] ?? $message->status];
        if (isset($data['read_at']) || $data['status'] === 'read') $updates['read_at'] = now();
        if (isset($data['delivered_at']) || $data['status'] === 'delivered') $updates['delivered_at'] = now();

        $message->update($updates);
    }

    protected function handleMessage(array $data)
    {
        if (WhatsAppMessage::where('message_id', $data['id'])->exists()) return;

        $message = WhatsAppMessage::create([
            'message_id' => $data['id'],
            'phone' => $data['from'] ?? $data['phone'],
            'message' => $data['text'] ?? $data['body'] ?? '',
            'direction' => 'incoming',
            'status' => 'received',
            'type' => $data['type'] ?? 'text',
            'reference_id' => $data['reply_to'] ?? null,
            'received_at' => now()
        ]);

        if (isset($data['reply_to'])) {
            $parent = WhatsAppMessage::where('message_id', $data['reply_to'])->first();
            if ($parent) $message->update(['parent_message_id' => $parent->id, 'is_reply' => true]);
        }
    }

    protected function handleStatus(array $data)
    {
        $this->updateStatus($data['message_id'], $data);
    }

    protected function handleDeleted(array $data)
    {
        WhatsAppMessage::where('message_id', $data['message_id'])->update([
            'deleted_at' => now(),
            'deleted_by' => $data['deleted_by'] ?? 'system',
            'status' => 'deleted'
        ]);
    }
}
