<?php

namespace App\Jobs;

use App\Models\Patients\ImagingOrder;
use App\Models\Patients\ImagingResultFile;
use App\Services\Imaging\ImagingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessImagingUpload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 300;
    public int $backoff = 30;

    public function __construct(
        public readonly int $imagingOrderId,
        public readonly array $stagedFiles,
        public readonly ?array $itemIds,    // nullable — null means "whole order"
        public readonly string $fileType,
        public readonly ?string $notes,
        public readonly ?int $userId,
    ) {}

    public function handle(ImagingService $storage): void
    {
        $order = ImagingOrder::findOrFail($this->imagingOrderId);

        // null → [null] means: attach to the order, not a specific item.
        $itemIds = $this->itemIds ?: [null];

        foreach ($this->stagedFiles as $staged) {
            $finalPath = $storage->promoteFromStaging($staged['path'], $staged['original_name']);

            foreach ($itemIds as $itemId) {
                ImagingResultFile::create([
                    'imaging_order_id'      => $order->id,
                    'imaging_order_item_id' => $itemId,
                    'visit_token'           => $order->visit_token,
                    'patient_id'            => $order->patient_id,
                    'file_name'             => $staged['original_name'],
                    'file_path'             => $finalPath,
                    'file_type'             => $this->fileType,
                    'mime_type'             => $staged['mime'] ?: null,
                    'file_size'             => $staged['size'],
                    'uploaded_by'           => $this->userId,
                    'notes'                 => $this->notes,
                ]);
            }
        }

        if ($order->status === 'pending') {
            $order->update([
                'status'         => 'in_progress',
                'performed_by'   => $order->performed_by ?? $this->userId,
                'performed_date' => $order->performed_date ?? now(),
            ]);
        }
    }

    public function failed(Throwable $e): void
    {
        Log::error('ProcessImagingUpload failed', [
            'imaging_order_id' => $this->imagingOrderId,
            'staged_files'     => array_column($this->stagedFiles, 'path'),
            'error'            => $e->getMessage(),
        ]);

        foreach ($this->stagedFiles as $staged) {
            try {
                app(ImagingService::class)->discardStaged($staged['path']);
            } catch (Throwable) {
            }
        }
    }
}
