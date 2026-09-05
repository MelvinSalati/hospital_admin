<?php

namespace App\Jobs\Patients;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use App\Models\Communications\MessageTemplate;
// use App\Models\MessageTemplate;
use App\Communications\WhatsApp;

class RegistrationJob implements ShouldQueue
{
    use Queueable;

    protected string $name;
    protected string $patientNumber;
    protected string $phoneNumber;
    protected string $message;

    /**
     * Create a new job instance.
     */
    public function __construct(string $name, string $patientNumber, string $phoneNumber)
    {
        $this->name = $name;
        $this->patientNumber = $patientNumber;
        $this->phoneNumber = $phoneNumber;
        $this->message = '';
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Load registration template from database
        $template = MessageTemplate::findOrFail(1);

        if (!$template) {
            \Log::error("Registration template not found in database");
            return;
        }

        // Render template with patient data
        $message = $template->render([
            'name' => $this->name,
            'patient_number' => $this->patientNumber
        ]);

        // Send WhatsApp message
        $whatsApp = new WhatsApp();
        $formattedPhone = $whatsApp->formatPhone($this->phoneNumber);
        $result = $whatsApp->send($formattedPhone, $message, [
            'template' => 'patient_registration',
            'reference_id' => 'reg_' . $this->patientNumber
        ]);

        if (!$result['success']) {
            \Log::error("Failed to send registration message to {$formattedPhone}: " . ($result['error'] ?? 'Unknown error'));
        } else {
            \Log::info("Registration message sent successfully to {$formattedPhone}", [
                'patient_number' => $this->patientNumber,
                'message_id' => $result['data']['message_id'] ?? null
            ]);
        }
    }
}
