<?php

namespace App\Services\Laboratories;

use Spatie\PdfToText\Pdf;
use thiagoalessio\TesseractOCR\TesseractOCR;
use Symfony\Component\Process\Process;

class ResultOcrService
{
    public function extractText(string $path, string $mime): string
    {
        if ($mime === 'application/pdf') {
            // Digital PDFs (like the ones we generated) have a text layer: no OCR needed
            $text = trim((new Pdf('/usr/bin/pdftotext'))->setPdf($path)->setOptions(['layout'])->text());
            return strlen($text) > 40 ? $text : $this->ocrPdf($path);   // scanned PDF fallback
        }
        return $this->ocrImage($path);
    }

    private function ocrImage(string $path): string
    {
        return (new TesseractOCR($path))->lang('eng')->psm(6)->run();   // psm 6 = uniform text block
    }

    private function ocrPdf(string $path): string
    {
        $dir = sys_get_temp_dir() . '/ocr_' . uniqid();
        mkdir($dir);
        (new Process(['pdftoppm', '-r', '300', '-png', $path, "$dir/p"]))->mustRun();

        $text = collect(glob("$dir/p-*.png"))->sort()
            ->map(fn($img) => $this->ocrImage($img))->implode("\n");

        array_map('unlink', glob("$dir/*"));
        rmdir($dir);
        return $text;
    }
}