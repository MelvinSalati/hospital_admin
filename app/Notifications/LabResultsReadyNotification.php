<?php

namespace App\Notifications;

use App\Models\Patients\LabOrder;
use App\Models\Laboratories\LabResultFile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

class LabResultsReadyNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public LabOrder $order,
        public LabResultFile $file,
        public int $itemCount,
    ) {
        $this->onQueue('notifications');

        Log::info('[LabResultsReadyNotification] __construct', [
            'order_class'   => get_class($this->order),
            'order_id'      => $this->order->id ?? null,
            'file_id'       => $this->file->id ?? null,
            'item_count'    => $this->itemCount,
            'queue'         => $this->queue,
            'connection'    => $this->connection,
            'is_should_queue' => $this instanceof ShouldQueue,
        ]);
    }

    public function via(object $notifiable): array
    {
        Log::info('[LabResultsReadyNotification] via()', [
            'notifiable_class' => get_class($notifiable),
            'notifiable_id'    => $notifiable->id ?? null,
            'channels'         => ['database'],
        ]);

        return ['database'];
    }

    private function patientLabel(): string
    {
        try {
            $patient = $this->order->patient;

            if (! $patient) {
                Log::warning('[LabResultsReadyNotification] patientLabel: no patient relation', [
                    'order_id'   => $this->order->id ?? null,
                    'patient_id' => $this->order->patient_id ?? null,
                ]);

                return "Patient #{$this->order->patient_id}";
            }

            $name = trim(
                ($patient->first_name ?? '') . ' ' . ($patient->last_name ?? '')
            );

            $name = $name !== '' ? $name : "Patient #{$this->order->patient_id}";

            if (! empty($patient->patient_number)) {
                $name .= " ({$patient->patient_number})";
            }

            Log::info('[LabResultsReadyNotification] patientLabel resolved', [
                'label' => $name,
            ]);

            return $name;
        } catch (Throwable $e) {
            Log::error('[LabResultsReadyNotification] patientLabel threw', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return 'Patient (unknown)';
        }
    }

    public function toArray(object $notifiable): array
    {
        Log::info('[LabResultsReadyNotification] toArray() START', [
            'notifiable_class' => get_class($notifiable),
            'notifiable_id'    => $notifiable->id ?? null,
            'order_id'         => $this->order->id ?? null,
            'file_id'          => $this->file->id ?? null,
        ]);

        try {
            $patient      = $this->order->patient;
            $patientLabel = $this->patientLabel();

            $url = $patient
                ? "/patients/{$patient->id}"
                : "/laboratories/orders/{$this->order->id}";

            $payload = [
                'type'          => 'lab_results_ready',
                'title'         => 'Lab results ready',
                'lab_order_id'  => $this->order->id,
                'lab_result_id' => $this->file->id,
                'report_no'     => $this->file->report_no,
                'patient_id'    => $this->order->patient_id,
                'patient_name'  => $patientLabel,
                'item_count'    => $this->itemCount,
                'original_name' => $this->file->original_name,

                'message' => sprintf(
                    'Lab results for %s are ready (order #%d%s).',
                    $patientLabel,
                    $this->order->id,
                    $this->file->report_no
                        ? ", report {$this->file->report_no}"
                        : ''
                ),

                'url' => $url,

                'action' => [
                    'label' => 'Open patient',
                    'url'   => $url,
                ],
            ];

            Log::info('[LabResultsReadyNotification] toArray() SUCCESS', [
                'payload' => $payload,
            ]);

            return $payload;
        } catch (Throwable $e) {
            Log::error('[LabResultsReadyNotification] toArray() THREW', [
                'error' => $e->getMessage(),
                'file'  => $e->getFile() . ':' . $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Re-throw so the queue marks the job as failed (visible in failed_jobs).
            throw $e;
        }
    }

    public function toMail(object $notifiable): MailMessage
    {
        Log::info('[LabResultsReadyNotification] toMail()', [
            'notifiable_class' => get_class($notifiable),
        ]);

        $patientLabel = $this->patientLabel();
        $patient      = $this->order->patient;
        $url = $patient
            ? url("/patients/{$patient->id}")
            : url("/laboratories/orders/{$this->order->id}");

        return (new MailMessage)
            ->subject("Lab results ready: {$patientLabel}")
            ->line("Results for {$patientLabel} are now available.")
            ->when(
                $this->file->report_no,
                fn($m) => $m->line("Report No: {$this->file->report_no}")
            )
            ->line("Tests parsed: {$this->itemCount}")
            ->action('Open patient', $url)
            ->line('Please verify the results before releasing to the patient.');
    }
}
