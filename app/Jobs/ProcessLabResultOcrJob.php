<?php

namespace App\Jobs;

use App\Models\Laboratories\LabResultFile;
use App\Models\Patients\LabOrder;
use App\Models\User;
use App\Notifications\LabResultsReadyNotification;
use App\Services\Laboratories\LabResultPdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class ProcessLabResultOcrJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries   = 3;
    public int $backoff = 30;

    public function __construct(
        public int $labResultFileId,
        public ?array $selectedTests = null,
    ) {}

    public function handle(LabResultPdfService $svc): void
    {
        /** @var LabResultFile|null $file */
        $file = LabResultFile::with('labOrder')->find($this->labResultFileId);

        if (!$file) {
            Log::warning('ProcessLabResultOcrJob: lab_result_file missing', [
                'id' => $this->labResultFileId,
            ]);
            return;
        }

        if ($file->processing_status === 'completed') {
            return;
        }

        $file->update([
            'processing_status'     => 'processing',
            'processing_started_at' => now(),
            'processing_error'      => null,
        ]);

        $absPath = Storage::disk('public')->path($file->path);

        if (!is_file($absPath) || !is_readable($absPath)) {
            $file->update([
                'processing_status'       => 'failed',
                'processing_error'        => 'Stored PDF is missing or unreadable on disk.',
                'processing_completed_at' => now(),
            ]);
            return;
        }

        try {
            // ── 1. Extract (native → PaddleOCR) ─────────────────────────
            $result = $svc->extractTextFromStoredFile($absPath);

            // ── 2. Persist items ────────────────────────────────────────
            $svc->persistParsedItemsForFile(
                $file,
                $result['text'],
                $result['items'],
                $result['used_ocr'],
                $this->selectedTests,
            );

            $file->update([
                'processing_status'       => 'completed',
                'processing_error'        => null,
                'processing_completed_at' => now(),
                'ocr_engine'              => $result['used_ocr'] ? 'paddleocr' : 'native',
                'ocr_text'                => $result['text'],
            ]);

            Log::info('ProcessLabResultOcrJob: completed', [
                'file_id'  => $file->id,
                'items'    => count($result['items']),
                'used_ocr' => $result['used_ocr'],
            ]);

            // ── 3. Notify the ordering clinician ────────────────────────
            $this->notifyOrderer($file, count($result['items']));
        } catch (Throwable $e) {
            Log::error('ProcessLabResultOcrJob: failed', [
                'file_id' => $file->id,
                'error'   => $e->getMessage(),
                'trace'   => Str::limit($e->getTraceAsString(), 2000),
            ]);

            $file->update([
                'processing_status'       => 'failed',
                'processing_error'        => $e->getMessage(),
                'processing_completed_at' => now(),
            ]);

            throw $e;
        }
    }

    /**
     * Send a "results ready" notification to the clinician who placed
     * the order. Failures are logged but never fail the OCR job.
     */
    private function notifyOrderer(LabResultFile $file, int $itemCount): void
    {
        try {
            $orderedBy = DB::table('lab_orders')
                ->where('id', $file->lab_order_id)
                ->value('ordered_by');

            $notifiable = $orderedBy ? User::find($orderedBy) : null;

            if (!$notifiable) {
                $createdBy = DB::table('lab_order_items')
                    ->where('lab_order_id', $file->lab_order_id)
                    ->whereNotNull('created_by')
                    ->value('created_by');

                $notifiable = $createdBy ? User::find($createdBy) : null;
            }

            if (!$notifiable) {
                Log::warning('ProcessLabResultOcrJob: no notifiable user resolved', [
                    'file_id'      => $file->id,
                    'lab_order_id' => $file->lab_order_id,
                ]);
                return;
            }

            if (!empty($file->results_notified_at)) {
                Log::info('ProcessLabResultOcrJob: already notified, skipping', [
                    'file_id'             => $file->id,
                    'results_notified_at' => $file->results_notified_at,
                ]);
                return;
            }

            $order = LabOrder::with('patient')->find($file->lab_order_id);
            if (!$order) {
                Log::warning('ProcessLabResultOcrJob: order missing for notification', [
                    'lab_order_id' => $file->lab_order_id,
                ]);
                return;
            }

            $notifiable->notify(
                new LabResultsReadyNotification(
                    order: $order,
                    file: $file,
                    itemCount: $itemCount,
                )
            );

            $file->forceFill(['results_notified_at' => now()])->save();

            Log::info('ProcessLabResultOcrJob: notified orderer', [
                'file_id'          => $file->id,
                'lab_order_id'     => $file->lab_order_id,
                'notifiable_id'    => $notifiable->id,
                'notifiable_class' => get_class($notifiable),
                'item_count'       => $itemCount,
            ]);
        } catch (Throwable $e) {
            Log::error('ProcessLabResultOcrJob: notification failed', [
                'file_id' => $file->id,
                'error'   => $e->getMessage(),
                'trace'   => Str::limit($e->getTraceAsString(), 2000),
            ]);
            // Don't re-throw — OCR success is what matters
        }
    }

    public function failed(Throwable $e): void
    {
        LabResultFile::where('id', $this->labResultFileId)->update([
            'processing_status'       => 'failed',
            'processing_error'        => $e->getMessage(),
            'processing_completed_at' => now(),
        ]);
    }
}
