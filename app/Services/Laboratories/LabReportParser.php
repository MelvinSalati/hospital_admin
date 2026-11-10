<?php

namespace App\Services\Laboratories;

class LabReportParser
{
    public function header(string $text): array
    {
        preg_match('/\b(ZAT\d{6,})\b/i', $text, $no);
        preg_match('/^\s*([A-Z][A-Z ,\'-]+?)\s+(\d{1,3})\s*y\s*\(([MF])\)/mi', $text, $p);

        return [
            'report_no' => $no[1] ?? null,
            'name'      => isset($p[1]) ? trim($p[1]) : null,
            'age'       => $p[2] ?? null,
            'sex'       => $p[3] ?? null,
        ];
    }

    public function items(string $text): array
    {
        $items = [];
        foreach (preg_split('/\R/', $text) as $line) {
            // Numeric: "Sodium ..... 120 mmol/l [L] 136 - 145"
            if (preg_match('/^\s*(?<test>[A-Za-z][\w \-\/()]*?)\s*\.{2,}\s*(?<val>[<>]?\d+(?:\.\d+)?)\s*(?<unit>[^\s\[\d][^\s\[]*)?\s*(?:\[\s*[A-Z1]\s*\])?\s*(?:(?<lo>\d+(?:\.\d+)?)\s*[-–]\s*(?<hi>\d+(?:\.\d+)?))?\s*$/u', $line, $m)) {
                $num = (float) ltrim($m['val'], '<>');
                $lo  = ($m['lo'] ?? '') !== '' ? (float) $m['lo'] : null;
                $hi  = ($m['hi'] ?? '') !== '' ? (float) $m['hi'] : null;

                $items[] = [
                    'test_name' => trim($m['test']),
                    'value' => $m['val'],
                    'value_numeric' => $num,
                    'unit' => $m['unit'] ?? null,
                    'ref_low' => $lo,
                    'ref_high' => $hi,
                    // never trust OCR'd flags ([L] often reads as [1]); recompute
                    'flag' => $lo !== null && $num < $lo ? 'L' : ($hi !== null && $num > $hi ? 'H' : null),
                    'raw_line' => trim($line),
                ];
            }
            // Qualitative (urinalysis): "Protein ..... Trace"
            elseif (preg_match('/^\s*(?<test>[A-Za-z][\w \-\/()]*?)\s*\.{2,}\s*(?<val>[A-Za-z][A-Za-z ]*?)\s*$/', $line, $m)) {
                $items[] = [
                    'test_name' => trim($m['test']),
                    'value' => trim($m['val']),
                    'value_numeric' => null,
                    'unit' => null,
                    'ref_low' => null,
                    'ref_high' => null,
                    'flag' => null,
                    'raw_line' => trim($line)
                ];
            }
        }
        return $items;
    }
}
