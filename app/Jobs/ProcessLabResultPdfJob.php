<?php

namespace App\Jobs;

use App\Services\Laboratories\LabResultPdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Throwable;

class ProcessLabResultPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 300;

    public int $backoff = 30;

    public function __construct(
        public string $storedPath,       // relative path on 'public' disk
        public string $originalName,
        public ?string $mimeType,
        public ?int $size,
        public int $labOrderId,
        public int $patientId,
        public int $uploadedBy,
        public array $selectedTests,
    ) {
        $this->onQueue('lab-results');
    }

    public function handle(LabResultPdfService $service): void
    {
        $disk = Storage::disk('public');

        if (! $disk->exists($this->storedPath)) {
            throw new \RuntimeException("Stored PDF not found: {$this->storedPath}");
        }

        $absolutePath = $disk->path($this->storedPath);

        // Build an UploadedFile that mimics a real upload so the service
        // works without modification.
        $uploaded = new class(
            $absolutePath,
            $this->originalName,
            $this->mimeType ?? 'application/pdf',
            $this->size,
        ) extends UploadedFile {
            private string $originalNameAlias;

            public function __construct(
                string $path,
                string $originalName,
                ?string $mime,
                ?int $size
            ) {
                parent::__construct($path, $originalName, $mime, $size, true);
                $this->originalNameAlias = $originalName;
            }

            public function getClientOriginalName(): string
            {
                return $this->originalNameAlias;
            }

            public function getClientOriginalExtension(): string
            {
                return strtolower(pathinfo($this->originalNameAlias, PATHINFO_EXTENSION)) ?: 'pdf';
            }
        };

        $file = $service->process(
            $uploaded,
            $this->labOrderId,
            $this->patientId,
            $this->uploadedBy,
        );

        Log::info('LabResultPdf job completed', [
            'lab_result_file_id' => $file->id,
            'lab_order_id'       => $this->labOrderId,
            'patient_id'         => $this->patientId,
            'items'              => $file->resultItems->count(),
        ]);

        // Remove the temp upload now that the service has copied it under a UUID.
        Storage::disk('public')->delete($this->storedPath);
    }

    public function failed(Throwable $e): void
    {
        Log::error('LabResultPdf job failed', [
            'lab_order_id' => $this->labOrderId,
            'patient_id'   => $this->patientId,
            'stored_path'  => $this->storedPath,
            'error'        => $e->getMessage(),
        ]);

        // Keep the source PDF for manual recovery.
    }
}
