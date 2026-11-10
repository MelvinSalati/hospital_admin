<?php

namespace App\Events;

use App\Models\Patients\ImagingResultFile;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ImagingResultUploaded implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $file;

    public function __construct(ImagingResultFile $file)
    {
        $this->file = $file;
    }

    public function broadcastOn(): array
    {
        $order = $this->file->imagingOrder;

        // If we know who ordered it, broadcast to their private channel
        if ($order && $order->ordered_by) {
            return [new PrivateChannel('clinician.' . $order->ordered_by)];
        }

        // Fallback: broadcast to the whole radiology department if no clinician is found
        return [new PrivateChannel('department.5')];
    }

    public function broadcastWith(): array
    {
        $order = $this->file->imagingOrder;

        return [
            'fileId'      => $this->file->id,
            'orderId'     => $this->file->imaging_order_id,
            'orderNumber' => $order?->order_number,
            'patientName' => $order?->patient?->name ?? 'Unknown Patient',
            'test'        => trim(($order?->modality ?? '') . ' ' . ($order?->body_part ?? '')) ?: 'Imaging Study',
            'message'     => 'Imaging results are now available.',
            'imageUrl'    => \Illuminate\Support\Facades\Storage::url($this->file->file_path),
            'uploadedAt'  => now()->toIso8601String(),
        ];
    }
}
