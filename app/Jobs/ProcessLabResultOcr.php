<?php

namespace App\Jobs;

use App\Models\LabResult;
use App\Services\LabReportParser;
use App\Services\ResultOcrService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProcessLabResultOcr implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public string $labResultId
    ) {}

    public function handle(
        ResultOcrService $ocr,
        LabReportParser $parser
    ): void {
        $r = LabResult::findOrFail($this->labResultId);

        $r->update(['ocr_status' => 'pending']);

        try {
            $path = Storage::disk('local')->path($r->path);

            $text = $ocr->extractText(
                $path,
                $r->mime_type
            );

            if (trim($text) === '') {
                throw new \RuntimeException(
                    'OCR returned empty text.'
                );
            }

            $header = $parser->header($text);
            $items = $parser->items($text);

            DB::transaction(function () use (
                $r,
                $text,
                $header,
                $items
            ): void {
                $r->update([
                    'ocr_text' => $text,
                    'report_no' => $header['report_no'] ?? null,
                    'ocr_status' => 'done',
                ]);

                $r->items()->delete();

                if (!empty($items)) {
                    $r->items()->createMany($items);
                }
            });
        } catch (Throwable $e) {
            $r->update(['ocr_status' => 'failed']);

            report($e);

            throw $e;
        }
    }
}
