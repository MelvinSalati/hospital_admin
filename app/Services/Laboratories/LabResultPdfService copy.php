<?php

namespace App\Services\Laboratories;

use App\Models\Laboratories\LabResultFile;
use App\Models\Laboratories\LabResultItem;
use App\Models\Laboratories\Laboratory;          // ← make sure this model exists
use App\Models\Patients\LabOrder;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Smalot\PdfParser\Parser;
use Throwable;

class LabResultPdfService
{
    private const MIN_USEFUL_TEXT_LENGTH = 200;

    /**
     * Common aliases → canonical symbol.
     * Extend this array as you encounter new wording from labs.
     */
    private array $aliases = [
        // FBC core
        'hb'                    => 'HB',
        'hgb'                   => 'HB',
        'haemoglobin'           => 'HB',
        'hemoglobin'            => 'HB',
        'wbc'                   => 'WBC',
        'white cell count'      => 'WBC',
        'white blood cell count' => 'WBC',
        'white blood cells'     => 'WBC',
        'rbc'                   => 'RBC',
        'red cell count'        => 'RBC',
        'red blood cell count'  => 'RBC',
        'red blood cells'       => 'RBC',
        'plt'                   => 'PLT',
        'platelets'             => 'PLT',
        'platelet count'        => 'PLT',
        'hct'                   => 'HCT',
        'hematocrit'            => 'HCT',
        'haematocrit'           => 'HCT',
        'mcv'                   => 'MCV',
        'mch'                   => 'MCH',
        'mchc'                  => 'MCHC',
        'rdw'                   => 'RDW',
        'red cell distribution width' => 'RDW',
        'mpv'                   => 'MPV',
        'mean platelet volume'  => 'MPV',
        'pdw'                   => 'PDW',
        'platelet distribution width' => 'PDW',

        // Differential
        'neutrophils'           => 'NEUT',
        'neutrophil'            => 'NEUT',
        'lymphocytes'           => 'LYMPH',
        'lymphocyte'            => 'LYMPH',
        'monocytes'             => 'MONO',
        'monocyte'              => 'MONO',
        'eosinophils'           => 'EOS',
        'basophils'             => 'BASO',

        // Infectious
        'malaria'               => 'MALARIA',
        'malaria antigen'       => 'MALARIA',
        'malaria rapid'         => 'MALARIA',
        'plasmodium falciparum' => 'MALARIA',
        'plasmodium falciparum ag' => 'MALARIA',
        'hiv'                   => 'HIV',
        'hiv rapid'             => 'HIV',
        'hiv antibody'          => 'HIV',
        'hep b'                 => 'HBSAG',
        'hepatitis b'           => 'HBSAG',
        'hepatitis b surface antigen' => 'HBSAG',
        'hbsag'                 => 'HBSAG',
        'rpr'                   => 'RPR',
        'syphilis'              => 'RPR',
        'syphilis rpr'          => 'RPR',
        'vdrl'                  => 'RPR',
    ];

    public function process(
        UploadedFile $pdf,
        int $labOrderId,
        int $patientId,
        int $uploadedBy
    ): LabResultFile {
        if (strtolower($pdf->getClientOriginalExtension()) !== 'pdf') {
            throw new RuntimeException('Only PDF files are supported.');
        }

        $parser   = new Parser();
        $document = $parser->parseFile($pdf->getRealPath());
        $text     = trim($document->getText());
        $text     = $this->normaliseWhitespace($text);



        if (mb_strlen($text) < self::MIN_USEFUL_TEXT_LENGTH) {
            throw new RuntimeException(sprintf(
                'Extracted text is too short (%d chars). The PDF may be scanned or image-only; OCR is not enabled.',
                mb_strlen($text)
            ));
        }

        $filename = Str::uuid() . '.pdf';
        $path     = 'lab-results/' . $filename;

        if (!Storage::disk('public')->putFileAs('lab-results', $pdf, $filename)) {
            throw new RuntimeException('Could not store the uploaded PDF.');
        }

        try {
            return DB::transaction(function () use (
                $pdf,
                $labOrderId,
                $patientId,
                $uploadedBy,
                $text,
                $path
            ) {
                $reportNo = $this->extractFirstReportNumber($text)
                    ?? $this->extractReportNumberFromFilename($pdf->getClientOriginalName());

                $file = LabResultFile::create([
                    'lab_order_id'  => $labOrderId,
                    'patient_id'    => $patientId,
                    'uploaded_by'   => $uploadedBy,
                    'original_name' => $pdf->getClientOriginalName(),
                    'path'          => $path,
                    'mime_type'     => $pdf->getClientMimeType() ?: 'application/pdf',
                    'size'          => $pdf->getSize(),
                    'report_no'     => $reportNo,
                    'ocr_text'      => $text,
                ]);

                LabOrder::findOrFail($labOrderId)->update([
                    'status'          => 'completed',
                    'processing_date' => Carbon::now(),
                    'processed_by'    => $uploadedBy,
                ]);

                // Pre-load laboratories once for matching
                $laboratories = Laboratory::all(['id', 'symbol', 'name']);

                foreach ($this->parseResultLines($text) as $item) {
                    $item['laboratory_id'] = $this->resolveLaboratoryId(
                        $item['test_name'],
                        $laboratories
                    );

                    $file->resultItems()->create($item);
                }

                return $file->load('resultItems.laboratory');
            });
        } catch (Throwable $e) {
            Storage::disk('public')->delete($path);
            throw $e;
        }
    }

    // ---------------------------------------------------------------------
    // Laboratory matching
    // ---------------------------------------------------------------------

    private function resolveLaboratoryId(string $testName, $laboratories): ?int
    {
        $normalized = $this->normaliseName($testName);

        // 1. Exact alias hit
        if (isset($this->aliases[$normalized])) {
            $symbol = $this->aliases[$normalized];
            $lab = $laboratories->first(fn($l) => strtoupper($l->symbol) === $symbol);
            if ($lab) {
                return $lab->id;
            }
        }

        // 2. Exact symbol match
        $lab = $laboratories->first(fn($l) => $this->normaliseName($l->symbol) === $normalized);
        if ($lab) {
            return $lab->id;
        }

        // 3. Exact name match
        $lab = $laboratories->first(fn($l) => $this->normaliseName($l->name) === $normalized);
        if ($lab) {
            return $lab->id;
        }

        // 4. Fuzzy / contains match (safe thresholds)
        foreach ($laboratories as $lab) {
            $labNorm = $this->normaliseName($lab->name);
            $symNorm = $this->normaliseName($lab->symbol);

            if (strlen($normalized) >= 4 && (
                str_contains($labNorm, $normalized) ||
                str_contains($normalized, $labNorm) ||
                str_contains($symNorm, $normalized) ||
                str_contains($normalized, $symNorm)
            )) {
                return $lab->id;
            }
        }

        return null; // unknown test – still stored as free-text
    }

    private function normaliseName(string $name): string
    {
        $name = mb_strtolower(trim($name));
        $name = preg_replace('/[^a-z0-9]+/u', ' ', $name) ?? $name;
        return trim(preg_replace('/\s+/', ' ', $name) ?? $name);
    }

    // ---------------------------------------------------------------------
    // Text normalisation / report number
    // ---------------------------------------------------------------------

    private function normaliseWhitespace(string $text): string
    {
        $text = str_replace(["\r\n", "\r", "\xC2\xA0", "\u{00A0}"], ["\n", "\n", ' ', ' '], $text);
        $text = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;
        // Collapse long leader dots/underscores that labs love
        $text = preg_replace('/\.{3,}|_{3,}/u', ' ', $text) ?? $text;
        return $text;
    }

    private function extractFirstReportNumber(string $text): ?string
    {
        $prefixes = ['ZAT', 'ZAM', 'ZAH', 'LAB', 'REP', 'RPT', 'ACC', 'ORD', 'INV'];
        $pattern  = '/\b(?:' . implode('|', $prefixes) . ')[-_]?[A-Z0-9]{4,}\b/i';

        if (preg_match($pattern, $text, $m)) {
            return strtoupper($m[0]);
        }

        if (preg_match('/\b(?=[A-Z0-9-]{8,}\b)(?=(?:[^0-9]*[0-9]){2})[A-Z0-9-]+\b/i', $text, $m)) {
            return strtoupper($m[0]);
        }

        return null;
    }

    private function extractReportNumberFromFilename(string $name): ?string
    {
        if (preg_match('/\b([A-Z]{2,5}[-_]?\d{4,})\b/i', $name, $m)) {
            return strtoupper($m[1]);
        }
        return null;
    }

    // ---------------------------------------------------------------------
    // Result line parsing
    // ---------------------------------------------------------------------

    private function parseResultLines(string $text): array
    {
        $items = [];
        $seen  = [];

        $lines = preg_split('/\n/u', $text) ?: [];

        foreach ($lines as $rawLine) {
            $line = trim($rawLine);

            if ($line === '' || mb_strlen($line) > 500) {
                continue;
            }

            if ($this->isNonResultLine($line)) {
                continue;
            }

            $parsed = $this->parseLine($line);

            if ($parsed === null) {
                continue;
            }

            $key = mb_strtolower($parsed['test_name'] . '|' . $parsed['value'] . '|' . $parsed['raw_line']);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $items[] = $this->itemPayload(...$parsed);
        }

        return $items;
    }

    private function isNonResultLine(string $line): bool
    {
        // True section headers only (no result keyword / number)
        if (
            preg_match('/^(?:full blood count|differential count|hepatitis\s*[bc]?|syphilis|spyphilis|liver function|renal function|lipid profile|thyroid function|urinalysis|microbiology|serology|malaria\s+rapid|hiv\s+rapid)\b/iu', $line)
            && !preg_match('/\d|negative|positive|reactive|non-?reactive|normal|abnormal|trace|nil/i', $line)
        ) {
            return true;
        }

        if (preg_match('/^(?:page\s+\d+|disa\*?lab|www\.|tel[:.]|fax[:.]|referred by|request form|clinical data|sample\(s\)|collection|received|test\(s\) ordered|notes?|remarks?|---?\s*end of laboratory report|flags\s+ref\s*interval)/iu', $line)) {
            return true;
        }

        if (preg_match('/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/', $line)) {
            return true;
        }

        return false;
    }

    private function parseLine(string $line): ?array
    {
        $line = preg_replace('/^\[\*\]\s*/u', '', $line) ?? $line;

        if ($payload = $this->parseQuantitativeLine($line)) {
            return $payload;
        }

        return $this->parseQualitativeLine($line);
    }

    private function parseQuantitativeLine(string $line): ?array
    {
        $number = '[<>≤≥]?\s*-?\d+(?:[.,]\d+)?';
        // Accepts: x 10^3/µL, X 10^9/L, g/dL, %, fL, etc.
        $unit   = '(?:[xX]\s*10\s*[\^eE]?\s*-?\d+\s*[\/]?[a-zA-Zµμ%°]*|[a-zA-Zµμ%°\/\^\.\d\s]{1,25})';

        $pattern = '/^
            (?<name>[A-Za-z][^0-9]{1,90}?)
            \s+
            (?<value>' . $number . ')
            \s*
            (?<unit>' . $unit . ')?
            \s*
            (?:\[?\s*(?<flag>[HL\*hl]|High|Low|Abnormal)\s*\]?)?
            \s*
            (?:
                (?:ref(?:erence)?(?:\s+range)?\s*:?\s*)?
                (?<low>' . $number . ')
                \s*(?:-|–|—|to)\s*
                (?<high>' . $number . ')
            )?
            \s*$/ixu';

        if (!preg_match($pattern, $line, $m)) {
            return null;
        }

        // Must have some evidence this is a real numeric result
        if (empty($m['unit']) && empty($m['flag']) && empty($m['low'])) {
            return null;
        }

        $name = $this->cleanTestName($m['name']);
        if (!$this->isPlausibleTestName($name)) {
            return null;
        }

        return [
            'name'          => $name,
            'value'         => trim($m['value']),
            'numeric_value' => $this->normalizeNumber($m['value']),
            'unit'          => isset($m['unit']) ? trim(preg_replace('/\s+/', ' ', $m['unit'])) : null,
            'flag'          => isset($m['flag']) ? strtoupper(trim($m['flag'], "[] ")) : null,
            'ref_low'       => ($m['low']  ?? '') !== '' ? $this->normalizeNumber($m['low'])  : null,
            'ref_high'      => ($m['high'] ?? '') !== '' ? $this->normalizeNumber($m['high']) : null,
            'raw_line'      => $line,
        ];
    }

    private function parseQualitativeLine(string $line): ?array
    {
        $candidates = [];

        // Prefer clear separators
        if (preg_match('/^(?<name>.+?)\s{2,}|\.{2,}\s*(?<value>.+)$/u', $line, $m)) {
            $candidates[] = [$m['name'], $m['value']];
        }
        if (preg_match('/^(?<name>[^:]{2,80}?)\s*[:\-]\s*(?<value>.+)$/u', $line, $m)) {
            $candidates[] = [$m['name'], $m['value']];
        }
        // Last-resort only when value looks qualitative
        if (preg_match('/^(?<name>[A-Za-z][A-Za-z0-9 \.\-\/&()]{1,70}?)\s+(?<value>(?:Negative|Positive|Reactive|Non-?Reactive|Normal|Abnormal|Trace|Nil|Absent|Present|Seen|Not seen).*)$/iu', $line, $m)) {
            $candidates[] = [$m['name'], $m['value']];
        }

        foreach ($candidates as [$rawName, $rawValue]) {
            $name  = $this->cleanTestName($rawName);
            $value = trim($rawValue);

            if (!$this->isPlausibleTestName($name) || $value === '' || mb_strlen($value) > 120) {
                continue;
            }
            if (preg_match('/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/', $value)) {
                continue;
            }

            $wordCount = str_word_count($value);
            if ($wordCount > 6 && !preg_match('/\b(?:negative|positive|reactive|non-?reactive|normal|abnormal|trace|nil|absent|present|seen|not seen)\b/i', $value)) {
                continue;
            }

            if (preg_match('/^(?:flags|ref|interval|test|result|unit|range|page|date|time|sample|collection|received|referred|laboratory|report)\b/i', $name)) {
                continue;
            }

            return [
                'name'          => $name,
                'value'         => $value,
                'numeric_value' => null,
                'unit'          => null,
                'flag'          => null,
                'ref_low'       => null,
                'ref_high'      => null,
                'raw_line'      => $line,
            ];
        }

        return null;
    }

    private function itemPayload(
        string $name,
        string $value,
        ?float $numericValue,
        ?string $unit,
        ?string $flag,
        ?float $refLow,
        ?float $refHigh,
        string $rawLine
    ): array {
        return [
            'test_name'     => $name,
            'value'         => trim($value),
            'value_numeric' => $numericValue,
            'unit'          => $unit,
            'flag'          => $flag,
            'ref_low'       => $refLow,
            'ref_high'      => $refHigh,
            'raw_line'      => $rawLine,
            'verified_by'   => null,
            'verified_at'   => null,
            // laboratory_id is added later in process()
        ];
    }

    private function normalizeNumber(string $value): float
    {
        return (float) str_replace(',', '.', trim($value, " \t<>≤≥"));
    }

    private function cleanTestName(string $name): string
    {
        $name = preg_replace('/\s+/u', ' ', $name) ?? $name;
        $name = preg_replace('/[\.\_\-]{2,}$/u', '', $name) ?? $name;
        return trim($name, " \t.:-_");
    }

    private function isPlausibleTestName(string $name): bool
    {
        if ($name === '' || mb_strlen($name) > 100) {
            return false;
        }

        return preg_match('/[a-z]/i', $name) === 1
            && preg_match('/^\d+$/', $name) !== 1;
    }

    // ---------------------------------------------------------------------
    // Ordered-tests extraction & validation (unchanged API, slightly improved)
    // ---------------------------------------------------------------------

    public function extractOrderedTests(string $text): ?array
    {
        $text = $this->normaliseWhitespace($text);
        if ($text === '') {
            return null;
        }

        Log::debug('===== RAW PDF TEXT START =====');
        Log::debug($text);
        Log::debug('===== RAW PDF TEXT END =====');

        // Strategy 1: Look for the classic "Test(s) Ordered" label
        if (preg_match(
            '/tests?\s*(?:\(\s*s\s*\))?\s+ordered\s*:?\s*(.+?)(?=\n\s*(?:request form|clinical data|sample|collection|received|referred|malaria|hiv|full blood|flags|notes|$))/ius',
            $text,
            $m
        )) {
            $section = trim($m[1]);
        }
        // Strategy 2: Some labs put it on the next line
        elseif (preg_match(
            '/tests?\s*(?:\(\s*s\s*\))?\s+ordered\s*:?\s*\n\s*(.+?)(?=\n\s*(?:request form|clinical data|sample|collection|received|referred|malaria|hiv|full blood|flags|notes|$))/ius',
            $text,
            $m
        )) {
            $section = trim($m[1]);
        }
        // Strategy 3: Fallback – look for a comma-separated list that looks like ordered tests
        elseif (preg_match(
            '/\b((?:FBC|CBC|Diff|Malaria|HIV|Hep\s*B|HBsAg|RPR|VDRL|LFT|RFT|TFT|ESR|CRP)(?:\s*[,\/]\s*(?:FBC|CBC|Diff|Malaria|HIV|Hep\s*B|HBsAg|RPR|VDRL|LFT|RFT|TFT|ESR|CRP))+)/i',
            $text,
            $m
        )) {
            $section = $m[1];
        } else {
            return null;
        }

        // Clean and split
        $section = preg_replace('/\s+/', ' ', $section);
        $tests   = preg_split('/\s*[,;\/]\s*/', $section, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $tests = array_values(array_filter(
            array_map(fn($t) => trim($t, " \t\n\r\0\x0B:;,-."), $tests),
            fn($t) => $t !== '' && mb_strlen($t) > 1
        ));

        return $tests !== [] ? $tests : null;
    }
    private function isOrderedTestsStopLine(string $line): bool
    {
        if (preg_match('/\bFLAGS\b.*\bREF(?:ERENCE)?\s*INTERVAL\b/iu', $line)) {
            return true;
        }
        if (preg_match('/\.{2,}\s*[-+]?\d+(?:\.\d+)?/u', $line)) {
            return true;
        }
        if (preg_match('/^(?:NOTES|REMARKS|---?\s*END OF LABORATORY REPORT)\b/iu', $line)) {
            return true;
        }
        if (preg_match('/^(?:referred by|request form|clinical data|collection|received|sample)\b/iu', $line)) {
            return true;
        }
        return false;
    }

    public function validateOrderedTests(string $text, array $selectedTests): array
    {
        $orderedTests = $this->extractOrderedTests($text);

        Log::debug('Laboratory ordered-test extraction', [
            'ordered_tests' => $orderedTests,
            'selected'      => $selectedTests,
        ]);

        if ($orderedTests === null) {
            return [
                'valid'         => false,
                'status'        => 'verification_required',
                'message'       => 'Could not reliably extract the Test(s) Ordered section. Please verify the original report.',
                'ordered_tests' => [],
                'matched'       => [],
                'unmatched'     => $selectedTests,
            ];
        }

        $matched   = [];
        $unmatched = [];

        foreach ($selectedTests as $selected) {
            $selected = trim((string) $selected);
            if ($selected === '') {
                continue;
            }

            $isMatch = false;
            $selNorm = $this->normaliseName($selected);

            foreach ($orderedTests as $ordered) {
                $ordNorm = $this->normaliseName($ordered);

                if (
                    $selNorm === $ordNorm ||
                    str_contains($ordNorm, $selNorm) ||
                    str_contains($selNorm, $ordNorm) ||
                    (isset($this->aliases[$selNorm]) && $this->normaliseName($this->aliases[$selNorm]) === $ordNorm)
                ) {
                    $isMatch = true;
                    break;
                }
            }

            if ($isMatch) {
                $matched[] = $selected;
            } else {
                $unmatched[] = $selected;
            }
        }

        $valid = count($unmatched) === 0 && count($matched) > 0;

        return [
            'valid'         => $valid,
            'status'        => $valid ? 'matched' : 'mismatch',
            'message'       => $valid
                ? 'Selected tests match the report.'
                : 'Some selected tests were not found in the report’s Test(s) Ordered section.',
            'ordered_tests' => $orderedTests,
            'matched'       => $matched,
            'unmatched'     => $unmatched,
        ];
    }
}
