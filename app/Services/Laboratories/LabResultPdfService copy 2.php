<?php

namespace App\Services\Laboratories;

use App\Models\Laboratories\LabResultFile;
use App\Models\Laboratories\LabResultItem;
use App\Models\Laboratories\LabResultMiscellaneousItem;
use App\Models\Laboratories\Laboratory;
use App\Models\Patients\LabOrder;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Smalot\PdfParser\Parser;
use Throwable;

class LabResultPdfService
{
    private const MIN_USEFUL_TEXT_LENGTH     = 200;
    private const OCR_MIN_USEFUL_TEXT_LENGTH = 50;
    private const MISCELLANEOUS_PREFIX       = 'Miscellaneous — not requested on this order — ';

    /** Match threshold for dynamic matcher. */
    private const MATCH_THRESHOLD = 0.6;

    /** @var array<int, array<string,mixed>>|null */
    private ?array $lastOcrItems = null;

    /**
     * Alias → canonical symbol. Optional boost for canonical matching.
     * NOT required for items to match — token overlap handles most cases.
     */
    private array $aliases = [
        // FBC
        'hb'                          => 'HB',
        'hgb'                         => 'HB',
        'haemoglobin'                 => 'HB',
        'hemoglobin'                  => 'HB',
        'wbc'                         => 'WBC',
        'white cell count'            => 'WBC',
        'white blood cell count'      => 'WBC',
        'white blood cells'           => 'WBC',
        'rbc'                         => 'RBC',
        'red cell count'              => 'RBC',
        'red blood cell count'        => 'RBC',
        'red blood cells'             => 'RBC',
        'plt'                         => 'PLT',
        'platelets'                   => 'PLT',
        'platelet count'              => 'PLT',
        'hct'                         => 'HCT',
        'hematocrit'                  => 'HCT',
        'haematocrit'                 => 'HCT',
        'mcv'                         => 'MCV',
        'mch'                         => 'MCH',
        'mchc'                        => 'MCHC',
        'rdw'                         => 'RDW',
        'red cell distribution width' => 'RDW',
        'mpv'                         => 'MPV',
        'mean platelet volume'        => 'MPV',
        'pdw'                         => 'PDW',
        'platelet distribution width' => 'PDW',

        // Differential
        'neutrophils'                 => 'NEUT',
        'neutrophil'                  => 'NEUT',
        'lymphocytes'                 => 'LYMPH',
        'lymphocyte'                  => 'LYMPH',
        'monocytes'                   => 'MONO',
        'monocyte'                    => 'MONO',
        'eosinophils'                 => 'EOS',
        'basophils'                   => 'BASO',

        // Infectious
        'malaria'                     => 'MALARIA',
        'malaria antigen'             => 'MALARIA',
        'malaria rapid'               => 'MALARIA',
        'malaria parasite test'       => 'MALARIA',
        'malaria rapid diagnostic test' => 'MALARIA',
        'malaria rdt'                 => 'MALARIA',
        'plasmodium falciparum'       => 'MALARIA',
        'plasmodium falciparum ag'    => 'MALARIA',
        'hiv'                         => 'HIV',
        'hiv rapid'                   => 'HIV',
        'hiv antibody'                => 'HIV',
        'hiv test'                    => 'HIV',
        'hiv screening'               => 'HIV',
        'hep b'                       => 'HBSAG',
        'hepatitis b'                 => 'HBSAG',
        'hepatitis b test'            => 'HBSAG',
        'hepatitis b surface antigen' => 'HBSAG',
        'hbsag'                       => 'HBSAG',
        'rpr'                         => 'RPR',
        'syphilis'                    => 'RPR',
        'syphilis rpr'                => 'RPR',
        'spyphilis'                   => 'RPR',
        'spyphilis rpr'               => 'RPR',
        'vdrl'                        => 'RPR',

        // Chemistries
        'glu'                         => 'GLU',
        'glucose'                     => 'GLU',
        'blood glucose'               => 'GLU',
        'urea'                        => 'UREA',
        'cre'                         => 'CRE',
        'creatinine'                  => 'CRE',
        'na'                          => 'NA',
        'sodium'                      => 'NA',
        'k'                           => 'K',
        'potassium'                   => 'K',
        'cl'                          => 'CL',
        'chloride'                    => 'CL',
        'ca'                          => 'CA',
        'calcium'                     => 'CA',
        'mg'                          => 'MG',
        'magnesium'                   => 'MG',
        'phos'                        => 'PHOS',
        'phosphate'                   => 'PHOS',
        'alt'                         => 'ALT',
        'ast'                         => 'AST',
        'alp'                         => 'ALP',
        'ggt'                         => 'GGT',
        'bili'                        => 'BILI',
        'bilirubin'                   => 'BILI',
        'esr'                         => 'ESR',
        'crp'                         => 'CRP',
        'hba1c'                       => 'HBA1C',
    ];

    /**
     * Optional group aliases — for grouped tests where child names share
     * no tokens with the parent label (e.g. "Malaria Parasite Test" vs
     * "Plasmodium Falciparum Ag"). Not required for direct matches.
     */
    private array $groupAliases = [
        'fbc' => [
            'wbc',
            'white cell count',
            'rbc',
            'red cell count',
            'hb',
            'haemoglobin',
            'hemoglobin',
            'hct',
            'haematocrit',
            'mcv',
            'mch',
            'mchc',
            'rdw',
            'plt',
            'platelets',
            'mpv',
            'pdw',
            'white blood cell count',
            'red blood cell count',
            'red cell distribution width',
            'mean platelet volume',
            'platelet distribution width',
        ],
        'cbc' => [
            'wbc',
            'white cell count',
            'rbc',
            'red cell count',
            'hb',
            'haemoglobin',
            'hemoglobin',
            'hct',
            'haematocrit',
            'mcv',
            'mch',
            'mchc',
            'rdw',
            'plt',
            'platelets',
            'mpv',
            'pdw',
        ],
        'full blood count' => [
            'wbc',
            'white cell count',
            'rbc',
            'red cell count',
            'hb',
            'haemoglobin',
            'hemoglobin',
            'hct',
            'haematocrit',
            'mcv',
            'mch',
            'mchc',
            'rdw',
            'plt',
            'platelets',
            'mpv',
            'pdw',
        ],
        'diff'                => ['neutrophils', 'lymphocytes', 'monocytes', 'eosinophils', 'basophils'],
        'differential'        => ['neutrophils', 'lymphocytes', 'monocytes', 'eosinophils', 'basophils'],
        'differential count'  => ['neutrophils', 'lymphocytes', 'monocytes', 'eosinophils', 'basophils'],

        'lft'            => ['alt', 'ast', 'alp', 'ggt', 'bili', 'bilirubin', 'total protein', 'albumin'],
        'liver function' => ['alt', 'ast', 'alp', 'ggt', 'bili', 'bilirubin', 'total protein', 'albumin'],
        'rft'            => [
            'urea',
            'creatinine',
            'cre',
            'na',
            'k',
            'cl',
            'ca',
            'mg',
            'phos',
            'sodium',
            'potassium',
            'chloride',
            'calcium',
            'magnesium',
            'phosphate'
        ],
        'renal function' => [
            'urea',
            'creatinine',
            'cre',
            'na',
            'k',
            'cl',
            'ca',
            'mg',
            'phos',
            'sodium',
            'potassium',
            'chloride',
            'calcium',
            'magnesium',
            'phosphate'
        ],

        'urine'      => [
            'ph',
            'specific gravity',
            'protein',
            'glucose',
            'ketones',
            'blood',
            'leukocytes',
            'nitrite',
            'bilirubin',
            'urobilinogen',
            'colour',
            'color',
            'appearance',
            'epithelial cells',
            'casts',
            'crystals',
            'bacteria',
            'yeast',
            'urinalysis'
        ],
        'urinalysis' => [
            'ph',
            'specific gravity',
            'protein',
            'glucose',
            'ketones',
            'blood',
            'leukocytes',
            'nitrite',
            'bilirubin',
            'urobilinogen',
            'colour',
            'color',
            'appearance',
            'epithelial cells',
            'casts',
            'crystals',
            'bacteria',
            'yeast',
            'urinalysis'
        ],

        'hepatitis b' => ['hbsag', 'hepatitis b surface antigen', 'hbeag', 'anti-hbs', 'anti-hbc', 'hbv'],
        'hep b'       => ['hbsag', 'hepatitis b surface antigen', 'hbeag', 'anti-hbs', 'anti-hbc', 'hbv'],

        'hiv'           => ['hiv rapid', 'hiv antibody', 'hiv 1/2', 'hiv'],
        'hiv rapid'     => ['hiv rapid', 'hiv antibody', 'hiv 1/2', 'hiv'],
        'hiv test'      => ['hiv rapid', 'hiv antibody', 'hiv 1/2', 'hiv'],
        'hiv screening' => ['hiv rapid', 'hiv antibody', 'hiv 1/2', 'hiv'],

        'malaria'                        => [
            'malaria antigen',
            'malaria rapid',
            'plasmodium falciparum ag',
            'plasmodium falciparum',
            'malaria',
            'mp'
        ],
        'malaria rapid'                  => [
            'malaria antigen',
            'malaria rapid',
            'plasmodium falciparum ag',
            'plasmodium falciparum',
            'malaria',
            'mp'
        ],
        'malaria parasite test'          => [
            'malaria antigen',
            'malaria rapid',
            'plasmodium falciparum ag',
            'plasmodium falciparum',
            'malaria',
            'mp'
        ],
        'malaria rapid diagnostic test'  => [
            'malaria antigen',
            'malaria rapid',
            'plasmodium falciparum ag',
            'plasmodium falciparum',
            'malaria',
            'mp'
        ],

        'rpr'      => ['rpr', 'vdrl', 'syphilis', 'tpha'],
        'syphilis' => ['rpr', 'vdrl', 'syphilis', 'tpha'],

        'tft'              => ['tsh', 't3', 't4', 'free t3', 'free t4'],
        'thyroid'          => ['tsh', 't3', 't4', 'free t3', 'free t4'],
        'thyroid function' => ['tsh', 't3', 't4', 'free t3', 'free t4'],
    ];

    /**
     * Short tokens that are medically significant for overlap scoring
     * (e.g. "hiv", "hb", "wbc"). Treated like 5+ char tokens.
     */
    private array $significantShortTokens = [
        'hiv',
        'hbv',
        'hcv',
        'rbc',
        'wbc',
        'plt',
        'hb',
        'hgb',
        'mcv',
        'mch',
        'rdw',
        'mpv',
        'pdw',
        'esr',
        'crp',
        'alt',
        'ast',
        'alp',
        'ggt',
        't3',
        't4',
        'tsh',
        'na',
        'cl',
        'ca',
        'mg',
        'k',
        'ph',
        'sg',
        'rpr',
        'vdrl',
        'fbc',
        'cbc',
        'lft',
        'rft',
        'tft',
        'hct',
        'mp',
        'ag',
        'igg',
        'igm',
    ];

    // =====================================================================
    // PUBLIC — Upload flow
    // =====================================================================

    public function process(
        UploadedFile $pdf,
        int $labOrderId,
        int $patientId,
        int $uploadedBy,
        ?array $selectedTests = null
    ): LabResultFile {
        if (strtolower($pdf->getClientOriginalExtension()) !== 'pdf') {
            throw new RuntimeException('Only PDF files are supported.');
        }

        [$text, $usedOcr] = $this->extractTextWithOcrFallback($pdf);
        $labOrder = LabOrder::findOrFail($labOrderId);

        return $this->processWithExtractedText(
            $pdf,
            $text,
            $usedOcr,
            $labOrder,
            $uploadedBy,
            $selectedTests
        );
    }

    public function extractTextWithOcrFallback(UploadedFile $pdf): array
    {
        $this->lastOcrItems = null;

        $text = $this->extractText($pdf);

        if (mb_strlen($text) >= self::MIN_USEFUL_TEXT_LENGTH) {
            return [$text, false];
        }

        Log::info('LabResultPdfService: native text too short, trying PaddleOCR', [
            'native_length' => mb_strlen($text),
        ]);

        $realPath = $pdf->getRealPath();
        if ($realPath === false || !is_file($realPath) || !is_readable($realPath)) {
            throw new RuntimeException('Uploaded PDF temp file is not readable.');
        }

        $bytes = @file_get_contents($realPath);
        if ($bytes === false || $bytes === '') {
            throw new RuntimeException('Could not read uploaded PDF bytes.');
        }

        $ocrText = $this->runPaddleOcrFromBytes(
            $bytes,
            $pdf->getClientOriginalName(),
            $pdf->getClientMimeType()
        );

        if ($ocrText !== null && mb_strlen($ocrText) >= self::OCR_MIN_USEFUL_TEXT_LENGTH) {
            return [$this->normaliseWhitespace($ocrText), true];
        }

        throw new RuntimeException(sprintf(
            'Extracted text is too short (%d chars) and OCR fallback did not return usable text.',
            mb_strlen($text)
        ));
    }

    public function processWithExtractedText(
        UploadedFile $pdf,
        string $text,
        bool $usedOcr,
        LabOrder $labOrder,
        int $uploadedBy,
        ?array $selectedTests = null
    ): LabResultFile {
        $filename = Str::uuid() . '.pdf';
        $path     = 'lab-results/' . $filename;

        if (!Storage::disk('public')->putFileAs('lab-results', $pdf, $filename)) {
            throw new RuntimeException('Could not store the uploaded PDF.');
        }

        try {
            $file = LabResultFile::create([
                'lab_order_id'  => $labOrder->id,
                'patient_id'    => $labOrder->patient_id,
                'uploaded_by'   => $uploadedBy,
                'original_name' => $pdf->getClientOriginalName(),
                'path'          => $path,
                'mime_type'     => $pdf->getClientMimeType() ?: 'application/pdf',
                'size'          => $pdf->getSize(),
            ]);

            $itemsToInsert = $this->lastOcrItems ?? $this->parseResultLines($text);

            $this->persistParsedItemsForFile($file, $text, $itemsToInsert, $usedOcr, $selectedTests);

            return $file->load(['resultItems.laboratory', 'miscellaneousItems.laboratory']);
        } catch (Throwable $e) {
            Storage::disk('public')->delete($path);
            throw $e;
        }
    }

    // =====================================================================
    // PUBLIC — Job flow
    // =====================================================================

    public function extractTextFromStoredFile(string $absPath): array
    {
        if (!is_file($absPath) || !is_readable($absPath)) {
            throw new RuntimeException("PDF not readable at: {$absPath}");
        }

        $this->lastOcrItems = null;

        $text = '';
        try {
            $parser   = new Parser();
            $document = $parser->parseFile($absPath);
            $text     = $this->normaliseWhitespace(trim($document->getText()));
        } catch (Throwable $e) {
            Log::warning('Native PDF extraction failed', ['error' => $e->getMessage()]);
        }

        if (mb_strlen($text) >= self::MIN_USEFUL_TEXT_LENGTH) {
            return [
                'text'     => $text,
                'items'    => $this->parseResultLines($text),
                'used_ocr' => false,
            ];
        }

        Log::info('LabResultPdfService: native text too short, trying PaddleOCR', [
            'native_length' => mb_strlen($text),
            'path'          => basename($absPath),
        ]);

        $bytes = file_get_contents($absPath);
        if ($bytes === false || $bytes === '') {
            throw new RuntimeException('Could not read PDF bytes for OCR.');
        }

        $ocrText = $this->runPaddleOcrFromBytes(
            $bytes,
            basename($absPath),
            mime_content_type($absPath) ?: 'application/pdf'
        );

        if ($ocrText !== null && mb_strlen($ocrText) >= self::OCR_MIN_USEFUL_TEXT_LENGTH) {
            $items = $this->lastOcrItems ?? $this->parseResultLines($ocrText);

            return [
                'text'     => $this->normaliseWhitespace($ocrText),
                'items'    => $items,
                'used_ocr' => true,
            ];
        }

        throw new RuntimeException(sprintf(
            'Text extraction failed. Native: %d chars. PaddleOCR: %s.',
            mb_strlen($text),
            $ocrText === null ? 'failed' : mb_strlen($ocrText) . ' chars'
        ));
    }

    public function persistParsedItemsForFile(
        LabResultFile $file,
        string $text,
        array $items,
        bool $usedOcr,
        ?array $selectedTests = null
    ): array {
        return DB::transaction(function () use ($file, $text, $items, $usedOcr, $selectedTests) {
            // ── 1. Report-number uniqueness guard ─────────────────────
            $reportNo = $file->report_no
                ?? $this->extractFirstReportNumber($text)
                ?? $this->extractReportNumberFromFilename($file->original_name ?? '');

            if (!empty($reportNo)) {
                $existing = LabResultFile::where('report_no', $reportNo)
                    ->where('id', '!=', $file->id)
                    ->first();

                if ($existing) {
                    throw new RuntimeException(
                        "Report number '{$reportNo}' has already been uploaded "
                            . "(file #{$existing->id}, original: {$existing->original_name}). "
                            . "Duplicate uploads are not allowed."
                    );
                }

                $file->forceFill(['report_no' => $reportNo])->save();
            }

            // ── 2. Idempotency ─────────────────────────────────────────
            $file->resultItems()->delete();
            $file->miscellaneousItems()->delete();

            // ── 3. Filter + insert ─────────────────────────────────────
            $laboratories = Laboratory::all(['id', 'symbol', 'name']);

            $summary = $this->insertItemsWithFilter(
                $file,
                $items,
                $laboratories,
                $selectedTests
            );

            // ── 4. Update parent order ─────────────────────────────────
            if ($file->labOrder) {
                $file->labOrder->update([
                    'status'          => 'completed',
                    'processing_date' => now(),
                ]);
            }

            Log::info('persistParsedItemsForFile: done', [
                'file_id'    => $file->id,
                'report_no'  => $reportNo,
                'inserted'   => $summary['inserted'],
                'matched'    => $summary['matched'],
                'missing'    => $summary['missing'],
                'misc_count' => count($summary['miscellaneous']),
                'used_ocr'   => $usedOcr,
            ]);

            return $summary;
        });
    }

    // =====================================================================
    // FILTERING
    // =====================================================================

    private function insertItemsWithFilter(
        LabResultFile $file,
        array $items,
        $laboratories,
        ?array $selectedTests
    ): array {
        $selectedCanonical = [];
        if (is_array($selectedTests)) {
            foreach ($selectedTests as $sel) {
                $sel = trim((string) $sel);
                if ($sel === '') {
                    continue;
                }
                $norm      = $this->normaliseName($sel);
                $canonical = $this->aliases[$norm] ?? null;

                $selectedCanonical[] = [
                    'original'  => $sel,
                    'norm'      => $norm,
                    'canonical' => $canonical,
                ];
            }
        }
        $hasFilter = !empty($selectedCanonical);

        Log::info('insertItemsWithFilter: selected normalised', [
            'file_id'   => $file->id,
            'selected'  => array_map(fn($s) => $s['norm'], $selectedCanonical),
            'canonical' => array_map(fn($s) => $s['canonical'], $selectedCanonical),
            'has_filter' => $hasFilter,
        ]);

        $inserted      = 0;
        $matched       = [];
        $miscellaneous = [];

        foreach ($items as $item) {
            $item['laboratory_id'] = $this->resolveLaboratoryId(
                $item['test_name'],
                $laboratories
            );

            if (!$hasFilter) {
                $file->resultItems()->create($item);
                $inserted++;
                continue;
            }

            $itemNorm      = $this->normaliseName($item['test_name']);
            $itemCanonical = $this->aliases[$itemNorm] ?? null;

            $matchResult = $this->matchSelected(
                $itemNorm,
                $itemCanonical,
                $selectedCanonical
            );

            Log::info('matchSelected: score', [
                'file_id'    => $file->id,
                'item'       => $item['test_name'],
                'matched'    => $matchResult['matched'],
                'score'      => $matchResult['score'] ?? 0,
                'reason'     => $matchResult['reason'] ?? '',
                'selected'   => $matchResult['selected_label'] ?? null,
            ]);

            if ($matchResult['matched']) {
                $file->resultItems()->create($item);
                $inserted++;
                $matched[] = $matchResult['selected_label'];

                Log::info('insertItemsWithFilter: MATCHED', [
                    'file_id'   => $file->id,
                    'test_name' => $item['test_name'],
                    'via'       => $matchResult['reason'],
                    'to'        => $matchResult['selected_label'],
                    'score'     => $matchResult['score'] ?? null,
                ]);
            } else {
                $file->miscellaneousItems()->create([
                    'lab_result_id'  => $file->id,
                    'lab_order_id'   => $file->lab_order_id,
                    'laboratory_id'  => $item['laboratory_id'] ?? null,
                    'test_name'      => $item['test_name'],
                    'value'          => $item['value'] ?? null,
                    'value_numeric'  => $item['value_numeric'] ?? null,
                    'unit'           => $item['unit'] ?? null,
                    'flag'           => $item['flag'] ?? null,
                    'ref_low'        => $item['ref_low'] ?? null,
                    'ref_high'       => $item['ref_high'] ?? null,
                    'raw_line'       => $item['raw_line'] ?? null,
                    'reason'         => 'not_ordered',
                ]);

                $miscellaneous[] = [
                    'test_name' => $item['test_name'],
                    'value'     => (string) ($item['value'] ?? ''),
                    'unit'      => $item['unit'] ?? null,
                    'reason'    => $matchResult['reason'] ?? 'not_ordered',
                ];

                Log::info('insertItemsWithFilter: MISC (not ordered)', [
                    'file_id'   => $file->id,
                    'test_name' => $item['test_name'],
                    'value'     => $item['value'],
                    'reason'    => $matchResult['reason'] ?? 'no-match',
                    'score'     => $matchResult['score'] ?? 0,
                ]);
            }
        }

        // Missing selected tests
        $missing = [];
        if ($hasFilter) {
            $matchedLabels = array_unique(array_map('mb_strtolower', $matched));

            foreach ($selectedCanonical as $sel) {
                $key1 = mb_strtolower($sel['original']);
                $key2 = mb_strtolower($sel['norm']);

                $found = false;
                foreach ($matchedLabels as $m) {
                    if ($m === $key1 || $m === $key2) {
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $missing[] = $sel['original'];
                }
            }
        }

        $summary = [
            'inserted'      => $inserted,
            'matched'       => array_values(array_unique($matched)),
            'missing'       => $missing,
            'miscellaneous' => $miscellaneous,
        ];

        Log::info('insertItemsWithFilter: summary', [
            'file_id'       => $file->id,
            'inserted'      => $inserted,
            'matched_count' => count($summary['matched']),
            'missing_count' => count($missing),
            'missing_names' => $missing,
            'misc_count'    => count($miscellaneous),
            'misc_names'    => array_column($miscellaneous, 'test_name'),
            'has_filter'    => $hasFilter,
        ]);

        return $summary;
    }

    /**
     * Match a parsed item against selected test labels.
     *
     * Dynamic scoring:
     *   Rule 1 — exact normalised match           → 1.0
     *   Rule 2 — canonical symbol match           → 0.95
     *   Rule 3 — token overlap (Jaccard + boost)  → 0–0.90
     *   Rule 4 — substring containment            → 0.60–0.85
     *   Rule 5 — fuzzy similarity                 → 0.60–0.85
     *
     * Returns the BEST match above MATCH_THRESHOLD.
     *
     * @return array{matched: bool, selected_label?: ?string, reason: string, score: float}
     */
    private function matchSelected(
        string $itemNorm,
        ?string $itemCanonical,
        array $selectedCanonical
    ): array {
        $itemTokens = $this->meaningfulTokens($itemNorm);

        $best = [
            'score'          => 0.0,
            'matched'        => false,
            'selected_label' => null,
            'reason'         => 'no-match',
        ];

        foreach ($selectedCanonical as $sel) {
            $selNorm   = $sel['norm'];
            $selTokens = $this->meaningfulTokens($selNorm);

            $score  = 0.0;
            $reason = '';

            // Rule 1 — exact
            if ($selNorm === $itemNorm) {
                $score  = 1.0;
                $reason = 'exact';
            }

            // Rule 2 — canonical
            if ($score < 1.0 && $sel['canonical'] !== null && $itemCanonical !== null) {
                if ($this->normaliseName($sel['canonical']) === $this->normaliseName($itemCanonical)) {
                    $score  = 0.95;
                    $reason = 'canonical';
                }
            }

            // Rule 3 — token overlap
            if ($score < 0.9 && !empty($itemTokens) && !empty($selTokens)) {
                $intersection = array_intersect($itemTokens, $selTokens);
                $union        = array_unique(array_merge($itemTokens, $selTokens));

                if (!empty($intersection)) {
                    $jaccard     = count($intersection) / count($union);
                    $hasBigToken = false;
                    foreach ($intersection as $tok) {
                        if (
                            mb_strlen($tok) >= 5
                            || in_array($tok, $this->significantShortTokens, true)
                        ) {
                            $hasBigToken = true;
                            break;
                        }
                    }

                    $tokenScore = $hasBigToken
                        ? min(0.9, 0.5 + $jaccard)
                        : $jaccard * 0.5;

                    if ($tokenScore > $score) {
                        $score  = $tokenScore;
                        $reason = 'token-overlap: ' . implode(',', array_slice($intersection, 0, 3));
                    }
                }
            }

            // Rule 4 — substring
            if ($score < 0.85 && mb_strlen($selNorm) >= 4 && mb_strlen($itemNorm) >= 4) {
                if (str_contains($selNorm, $itemNorm) || str_contains($itemNorm, $selNorm)) {
                    $containedLen  = min(mb_strlen($selNorm), mb_strlen($itemNorm));
                    $containerLen  = max(mb_strlen($selNorm), mb_strlen($itemNorm));
                    $ratio         = $containedLen / $containerLen;
                    $substringScore = min(0.85, 0.6 + 0.25 * $ratio);

                    if ($substringScore > $score) {
                        $score  = $substringScore;
                        $reason = 'substring';
                    }
                }
            }

            // Rule 5 — fuzzy
            if ($score < 0.75 && mb_strlen($selNorm) >= 5 && mb_strlen($itemNorm) >= 5) {
                $lev      = levenshtein($selNorm, $itemNorm);
                $maxLen   = max(mb_strlen($selNorm), mb_strlen($itemNorm));
                $levRatio = 1.0 - ($lev / $maxLen);

                similar_text($selNorm, $itemNorm, $percent);
                $simRatio = $percent / 100.0;

                $fuzzy = max($levRatio, $simRatio);

                if ($fuzzy > 0.75 && $fuzzy > $score) {
                    $score  = $fuzzy * 0.85;
                    $reason = 'fuzzy:' . round($fuzzy, 2);
                }
            }

            // Group alias fallback — only if still unmatched
            if ($score < self::MATCH_THRESHOLD) {
                $groupMembers = $this->groupAliases[$selNorm] ?? [];
                foreach ($groupMembers as $member) {
                    if ($this->normaliseName($member) === $itemNorm) {
                        $score  = 0.92;
                        $reason = 'group';
                        break;
                    }
                    if (
                        $itemCanonical !== null
                        && $this->normaliseName($member) === $this->normaliseName($itemCanonical)
                    ) {
                        $score  = 0.90;
                        $reason = 'group-canonical';
                        break;
                    }
                }
            }

            if ($score > $best['score']) {
                $best = [
                    'score'          => $score,
                    'matched'        => $score >= self::MATCH_THRESHOLD,
                    'selected_label' => $sel['original'],
                    'reason'         => $reason,
                ];
            }
        }

        return [
            'matched'        => $best['matched'],
            'selected_label' => $best['selected_label'],
            'reason'         => $best['reason'] ?: 'no-match',
            'score'          => round($best['score'], 3),
        ];
    }

    /**
     * Meaningful tokens for overlap scoring.
     *
     * @return array<int, string>
     */
    private function meaningfulTokens(string $norm): array
    {
        $stopwords = [
            'test',
            'tests',
            'the',
            'and',
            'or',
            'of',
            'for',
            'a',
            'an',
            'panel',
            'profile',
            'assay',
            'exam',
            'examination',
            'screen',
            'screening',
            'diagnostic',
            'diagnosis',
            'lab',
            'laboratory',
            'blood',
            'serum',
            'plasma',
            'sample',
        ];

        $words = preg_split('/\s+/', $norm) ?: [];
        $out   = [];

        foreach ($words as $w) {
            $w = trim($w);
            if ($w === '') continue;
            if (in_array($w, $stopwords, true)) continue;
            if (mb_strlen($w) >= 3) {
                $out[] = $w;
            }
        }

        return array_values(array_unique($out));
    }

    // =====================================================================
    // NATIVE TEXT EXTRACTION
    // =====================================================================

    private function extractText(UploadedFile $pdf): string
    {
        try {
            $parser   = new Parser();
            $document = $parser->parseFile($pdf->getRealPath());
            return $this->normaliseWhitespace(trim($document->getText()));
        } catch (Throwable $e) {
            Log::warning('Native PDF text extraction failed', ['error' => $e->getMessage()]);
            return '';
        }
    }

    // =====================================================================
    // PADDLE OCR
    // =====================================================================

    private function runPaddleOcrFromBytes(string $bytes, ?string $originalName, ?string $mime): ?string
    {
        $baseUrl = rtrim((string) config('services.paddle_ocr.base_url'), '/');
        if ($baseUrl === '') {
            Log::warning('PaddleOCR base URL not configured');
            return null;
        }
        if ($bytes === '') {
            Log::warning('PaddleOCR: empty byte payload');
            return null;
        }

        $timeout = (int) config('services.paddle_ocr.timeout', 180);
        $b64     = base64_encode($bytes);

        try {
            $payload = [
                'file'                      => $b64,
                'fileType'                  => 0,
                'useDocOrientationClassify' => false,
                'useDocUnwarping'           => false,
                'useTextlineOrientation'    => false,
                'textDetLimitSideLen'       => 960,
                'textDetLimitType'          => 'max',
                'textDetThresh'             => 0.3,
                'textDetBoxThresh'          => 0.6,
                'textDetUnclipRatio'        => 1.5,
                'textRecScoreThresh'        => 0.0,
                'returnWordBox'             => false,
                'visualize'                 => false,
            ];

            Log::info('PaddleOCR: sending request', [
                'url'      => $baseUrl . '/ocr',
                'b64_len'  => strlen($b64),
                'b64_head' => substr($b64, 0, 24) . '…',
                'original' => $originalName,
                'mime'     => $mime,
            ]);

            $response = Http::timeout($timeout)
                ->withOptions([
                    'curl' => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4],
                    'connect_timeout' => 30,
                ])
                ->acceptJson()
                ->asJson()
                ->post($baseUrl . '/ocr', $payload);

            Log::info('PaddleOCR: HTTP completed', [
                'status' => $response->status(),
                'bytes'  => strlen($response->body()),
            ]);

            Storage::disk('local')->put(
                'logs/paddle-raw-' . now()->format('Y-m-d_H-i-s') . '.json',
                $response->body()
            );

            if (!$response->successful()) {
                Log::warning('PaddleOCR returned non-2xx', [
                    'status' => $response->status(),
                    'body'   => Str::limit($response->body(), 5000),
                ]);
                return null;
            }

            $json       = $response->json();
            $ocrResults = $json['result']['ocrResults'] ?? null;

            if (is_array($ocrResults)) {
                $items = $this->parseOcrResultItems($ocrResults);

                Log::info('PaddleOCR: parsed items', ['count' => count($items)]);

                $this->lastOcrItems = $items;

                return $this->flattenOcrResponse($json) ?? '';
            }

            return $this->flattenOcrResponse($json);
        } catch (Throwable $e) {
            Log::error('PaddleOCR request failed', [
                'error' => $e->getMessage(),
                'type'  => get_class($e),
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
            ]);
            return null;
        }
    }

    private function flattenOcrResponse(mixed $payload): ?string
    {
        if (!is_array($payload)) {
            return null;
        }

        $ocrResults = $payload['result']['ocrResults'] ?? null;
        if (is_array($ocrResults)) {
            $lines = [];
            foreach ($ocrResults as $page) {
                $pruned   = $page['prunedResult'] ?? null;
                $recTexts = is_array($pruned) ? ($pruned['rec_texts'] ?? null) : null;
                if (is_array($recTexts)) {
                    foreach ($recTexts as $line) {
                        if (is_string($line) && trim($line) !== '') {
                            $lines[] = trim($line);
                        }
                    }
                }
            }
            if (!empty($lines)) {
                return implode("\n", $lines);
            }
        }

        $results = $payload['result']['results'] ?? null;
        if (is_array($results)) {
            $lines = [];
            foreach ($results as $r) {
                if (!is_array($r)) continue;
                foreach (['text', 'content'] as $k) {
                    if (isset($r[$k]) && is_string($r[$k]) && trim($r[$k]) !== '') {
                        $lines[] = trim($r[$k]);
                    }
                }
                if (isset($r['texts']) && is_array($r['texts'])) {
                    foreach ($r['texts'] as $line) {
                        if (is_string($line) && trim($line) !== '') {
                            $lines[] = trim($line);
                        }
                    }
                }
            }
            if (!empty($lines)) {
                return implode("\n", $lines);
            }
        }

        return null;
    }

    // =====================================================================
    // OCR CELL-BASED PARSING
    // =====================================================================

    private function reflowOcrPages(array $ocrResults, int $yTolerance = 15): array
    {
        $allRows = [];

        foreach ($ocrResults as $page) {
            $pruned = $page['prunedResult'] ?? null;
            if (!is_array($pruned)) continue;

            $texts = $pruned['rec_texts'] ?? null;
            $polys = $pruned['rec_polys'] ?? $pruned['dt_polys'] ?? null;

            if (!is_array($texts) || empty($texts)) continue;

            $cells = [];
            foreach ($texts as $i => $text) {
                if (!is_string($text) || trim($text) === '') continue;

                $text = $this->normalizeOcrTypos($text);
                $poly = is_array($polys) ? ($polys[$i] ?? null) : null;

                if (is_array($poly) && count($poly) >= 4) {
                    $xs = array_map(fn($p) => $p[0] ?? 0, $poly);
                    $ys = array_map(fn($p) => $p[1] ?? 0, $poly);
                    $x  = array_sum($xs) / count($xs);
                    $y  = array_sum($ys) / count($ys);
                } else {
                    $x = 0;
                    $y = $i * 100;
                }

                $cells[] = ['x' => (float) $x, 'y' => (float) $y, 'text' => trim($text)];
            }
            if (empty($cells)) continue;

            usort($cells, function ($a, $b) use ($yTolerance) {
                if (abs($a['y'] - $b['y']) > $yTolerance) return $a['y'] <=> $b['y'];
                return $a['x'] <=> $b['x'];
            });

            $rows       = [];
            $currentRow = [];
            $rowY       = null;
            foreach ($cells as $cell) {
                if ($rowY === null || abs($cell['y'] - $rowY) <= $yTolerance) {
                    $currentRow[] = $cell;
                    $rowY         = $rowY ?? $cell['y'];
                } else {
                    $rows[]     = $currentRow;
                    $currentRow = [$cell];
                    $rowY       = $cell['y'];
                }
            }
            if (!empty($currentRow)) $rows[] = $currentRow;

            foreach ($rows as &$row) {
                usort($row, fn($a, $b) => $a['x'] <=> $b['x']);
            }
            unset($row);

            $allRows = array_merge($allRows, $rows);
        }

        return $allRows;
    }

    private function normalizeOcrTypos(string $s): string
    {
        $s = preg_replace('/\bf1\b/u',         'fl',      $s) ?? $s;
        $s = preg_replace('/g\/d1\b/u',        'g/dl',    $s) ?? $s;
        $s = preg_replace('/10\^(\d+)\/1\b/u', '10^$1/L', $s) ?? $s;
        $s = preg_replace('/\s+/u',            ' ',       $s) ?? $s;
        return trim($s);
    }

    private function parseRowFromCells(array $cells): ?array
    {
        if (empty($cells)) return null;

        $numberPattern      = '[<>≤≥]?\s*-?\d+(?:[.,]\d+)?';
        $unitPattern        = '(?:[xX]\s*10\s*[\^eE]?\s*-?\d+\s*[\/]?[a-zA-Zµμ%°]*|[a-zA-Zµμ%°\/\^\.\d\s]{1,25})';
        $qualitativePattern = '(?:Negative|Positive|Reactive|Non[\s\-]*Reactive|Normal|Abnormal|Trace|Nil|Absent|Present|Not\s+seen|Seen|Detected|Not\s+detected)';

        $isRefRange    = fn(string $s) => (bool) preg_match("/^\s*{$numberPattern}\s*(?:-|–|—|to)\s*{$numberPattern}\s*$/u", $s);
        $isUnitCell    = fn(string $s) => (bool) preg_match('/^\s*[xX]?\s*10\^?\d+\s*[\/\.]?[a-zA-Z]*\s*$/u', $s);
        $isQualitative = fn(string $s) => (bool) preg_match("/^\s*{$qualitativePattern}(\b.*)?$/u", $s) && mb_strlen($s) <= 40;
        $isNumeric     = fn(string $s) => (bool) preg_match("/^\s*{$numberPattern}(\s*{$unitPattern})?(\s+{$numberPattern})?\s*%?\s*$/u", $s)
            || (bool) preg_match("/^\s*{$numberPattern}\s*%\s+{$numberPattern}\s*$/u", $s);

        $skipHeaders = [
            'flags',
            'refinterval',
            'ref interval',
            'reference interval',
            'reference range',
            'range',
            'unit',
            'result',
            'full blood count',
            'full blood count & platelets',
            'full blood count and platelets',
            'differential count',
            'hepatitis b',
            'hepatitis c',
            'malaria rapid',
            'clinical data',
            'research',
            'request form clinical and sample information',
            'sample(s)',
            'test(s) ordered',
            'notes',
            'end of laboratory report',
            'altaf memorial hospital',
            'page 1 of 1',
            'laboratory report',
        ];

        $isName = function (string $s) use ($skipHeaders, $isUnitCell) {
            $t = trim($s);
            if (mb_strlen($t) < 2 || mb_strlen($t) > 60) return false;
            if (!preg_match('/[A-Za-z]/', $t)) return false;
            if (in_array(mb_strtolower($t), $skipHeaders, true)) return false;
            if (preg_match('/^\s*[\d\.\-\s%]+$/', $t)) return false;
            if ($isUnitCell($t)) return false;
            return true;
        };

        $qualCells = [];
        $nameCells = [];
        $numCells  = [];
        $refCell   = null;

        foreach ($cells as $cell) {
            $t = $cell['text'];
            if ($isRefRange($t)) {
                $refCell   = $t;
                continue;
            }
            if ($isQualitative($t)) {
                $qualCells[] = $t;
                continue;
            }
            if ($isUnitCell($t)) {
                $numCells[] = ['text' => $t, 'unit' => $t, 'value' => ''];
                continue;
            }
            if ($isNumeric($t)) {
                $numCells[] = $t;
                continue;
            }
            if ($isName($t)) {
                $nameCells[] = $t;
            }
        }

        $chosenName = !empty($nameCells) ? end($nameCells) : null;

        if (!empty($qualCells) && $chosenName !== null) {
            return [
                'name'          => $this->cleanTestName($chosenName),
                'value'         => $qualCells[0],
                'numeric_value' => null,
                'unit'          => null,
                'flag'          => null,
                'ref_low'       => null,
                'ref_high'      => null,
                'raw_line'      => implode(' | ', array_column($cells, 'text')),
            ];
        }

        if (!empty($numCells) && $chosenName !== null) {
            $valueStr = '';
            $unitStr  = '';

            foreach ($numCells as $nc) {
                if (is_array($nc)) {
                    if ($unitStr === '') $unitStr = $nc['unit'];
                    continue;
                }
                if ($valueStr === '') {
                    if (preg_match("/^\s*({$numberPattern})\s*({$unitPattern})?\s*$/u", $nc, $m)) {
                        $valueStr = trim($m[1]);
                        if (!empty($m[2])) $unitStr = trim($m[2]);
                    } else {
                        $valueStr = trim($nc);
                    }
                } elseif (
                    preg_match('/^\d+(\.\d+)?$/', $valueStr)
                    && preg_match('/^\s*%\s*(\d+\.\d+)?/u', $nc)
                ) {
                    $valueStr = "{$valueStr} {$nc}";
                }
            }

            $refLow  = null;
            $refHigh = null;
            if ($refCell !== null) {
                if (preg_match("/^({$numberPattern})\s*(?:-|–|—|to)\s*({$numberPattern})$/u", $refCell, $m)) {
                    $refLow  = $this->normalizeNumber($m[1]);
                    $refHigh = $this->normalizeNumber($m[2]);
                }
            }

            return [
                'name'          => $this->cleanTestName($chosenName),
                'value'         => $valueStr,
                'numeric_value' => is_numeric($valueStr) ? (float) $valueStr : null,
                'unit'          => $unitStr !== '' ? $unitStr : null,
                'flag'          => null,
                'ref_low'       => $refLow,
                'ref_high'      => $refHigh,
                'raw_line'      => implode(' | ', array_column($cells, 'text')),
            ];
        }

        return null;
    }

    private function parseOcrResultItems(array $ocrResults): array
    {
        $rows  = $this->reflowOcrPages($ocrResults);
        $items = [];
        $seen  = [];

        $skipHeaders = [
            'flags',
            'refinterval',
            'ref interval',
            'reference interval',
            'reference range',
            'range',
            'unit',
            'result',
            'full blood count',
            'full blood count & platelets',
            'full blood count and platelets',
            'differential count',
            'hepatitis b',
            'hepatitis c',
            'syphilis',
            'syphilis rpr',
            'spyphilis',
            'spyphilis rpr',
            'rpr',
            'malaria rapid',
            'clinical data',
            'research',
            'request form clinical and sample information',
            'sample(s)',
            'test(s) ordered',
            'notes',
            'end of laboratory report',
            'altaf memorial hospital',
            'page 1 of 1',
            'laboratory report',
        ];

        $knownTestNames = [
            'rpr'                          => 'RPR',
            'syphilis'                     => 'RPR',
            'syphilis rpr'                 => 'RPR',
            'spyphilis'                    => 'RPR',
            'spyphilis rpr'                => 'RPR',
            'vdrl'                         => 'RPR',
            'hiv'                          => 'HIV',
            'hiv rapid'                    => 'HIV Rapid',
            'hepatitis b'                  => 'Hepatitis B',
            'hepatitis b surface antigen'  => 'Hepatitis B surface Antigen',
            'hepatitis c'                  => 'Hepatitis C',
            'malaria'                      => 'Malaria Antigen',
            'malaria rapid'                => 'Malaria Rapid',
            'fbc'                          => 'FBC',
            'urinalysis'                   => 'Urinalysis',
        ];

        $isQualitative = function (string $text): bool {
            return (bool) preg_match(
                '/^\s*(?:Negative|Positive|Reactive|Non[\s\-]*Reactive|Normal|Abnormal|Trace|Nil|Absent|Present|Not\s+seen|Seen|Detected|Not\s+detected)\s*$/iu',
                $text
            );
        };

        $pendingName = null;

        foreach ($rows as $cells) {
            if (empty($cells)) continue;

            $rowTexts = array_map(fn($c) => $c['text'], $cells);
            $joined   = implode(' | ', $rowTexts);

            $allHeaders = true;
            foreach ($rowTexts as $t) {
                if (!in_array(mb_strtolower(trim($t)), $skipHeaders, true)) {
                    $allHeaders = false;
                    break;
                }
            }
            if ($allHeaders) {
                $lower = mb_strtolower(trim($joined));
                if (isset($knownTestNames[$lower])) {
                    $pendingName = $knownTestNames[$lower];
                } elseif (count($rowTexts) === 1) {
                    foreach ($knownTestNames as $needle => $canonical) {
                        if (str_contains($lower, $needle)) {
                            $pendingName = $canonical;
                            break;
                        }
                    }
                }
                continue;
            }

            $item = $this->parseRowFromCells($cells);

            if ($item === null && $pendingName !== null && count($rowTexts) === 1 && $isQualitative($rowTexts[0])) {
                $item = [
                    'name'          => $pendingName,
                    'value'         => trim($rowTexts[0]),
                    'numeric_value' => null,
                    'unit'          => null,
                    'flag'          => null,
                    'ref_low'       => null,
                    'ref_high'      => null,
                    'raw_line'      => $joined,
                ];
                $pendingName = null;
            } elseif ($item !== null) {
                $pendingName = null;
            }

            if ($item === null) continue;

            $key = mb_strtolower($item['name'] . '|' . $item['value']);
            if (isset($seen[$key])) continue;
            $seen[$key] = true;

            $items[] = $this->itemPayload(
                $item['name'],
                $item['value'],
                $item['numeric_value'],
                $item['unit'],
                $item['flag'],
                $item['ref_low'],
                $item['ref_high'],
                $item['raw_line'],
            );
        }

        return $items;
    }

    // =====================================================================
    // HELPERS
    // =====================================================================

    private function resolveLaboratoryId(string $testName, $laboratories): ?int
    {
        $normalized = $this->normaliseName($testName);

        if (isset($this->aliases[$normalized])) {
            $symbol = $this->aliases[$normalized];
            $lab = $laboratories->first(fn($l) => strtoupper($l->symbol) === $symbol);
            if ($lab) return $lab->id;
        }

        $lab = $laboratories->first(fn($l) => $this->normaliseName($l->symbol) === $normalized);
        if ($lab) return $lab->id;

        $lab = $laboratories->first(fn($l) => $this->normaliseName($l->name) === $normalized);
        if ($lab) return $lab->id;

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

        return null;
    }

    private function normaliseName(string $name): string
    {
        $name = mb_strtolower(trim($name));
        $name = preg_replace('/[^a-z0-9]+/u', ' ', $name) ?? $name;
        return trim(preg_replace('/\s+/', ' ', $name) ?? $name);
    }

    private function normaliseWhitespace(string $text): string
    {
        $text = str_replace(["\r\n", "\r", "\xC2\xA0", "\u{00A0}"], ["\n", "\n", ' ', ' '], $text);
        $text = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;
        $text = preg_replace('/\.{3,}|_{3,}/u', ' ', $text) ?? $text;
        return $text;
    }

    private function extractFirstReportNumber(string $text): ?string
    {
        $prefixes = ['ZAT', 'ZAM', 'ZAH', 'LAB', 'REP', 'RPT', 'ACC', 'ORD', 'INV'];
        $pattern  = '/\b(?:' . implode('|', $prefixes) . ')[-_]?[A-Z0-9]{4,}\b/i';

        if (preg_match($pattern, $text, $m)) return strtoupper($m[0]);
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

    private function parseResultLines(string $text): array
    {
        $items = [];
        $seen  = [];
        $lines = preg_split('/\n/u', $text) ?: [];

        foreach ($lines as $rawLine) {
            $line = trim($rawLine);
            if ($line === '' || mb_strlen($line) > 500) continue;
            if ($this->isNonResultLine($line)) continue;

            $parsed = $this->parseLine($line);
            if ($parsed === null) continue;

            $key = mb_strtolower($parsed['name'] . '|' . $parsed['value'] . '|' . $parsed['raw_line']);
            if (isset($seen[$key])) continue;
            $seen[$key] = true;

            $items[] = $this->itemPayload(...$parsed);
        }

        return $items;
    }

    private function isNonResultLine(string $line): bool
    {
        if (
            preg_match('/^(?:full blood count|differential count|hepatitis\s*[bc]?|syphilis|spyphilis|liver function|renal function|lipid profile|thyroid function|urinalysis|microbiology|serology|malaria\s+rapid|hiv\s+rapid)\b/iu', $line)
            && !preg_match('/\d|negative|positive|reactive|non-?reactive|normal|abnormal|trace|nil/i', $line)
        ) {
            return true;
        }

        if (preg_match('/^(?:page\s+\d+|disa\*?lab|www\.|tel[:.]|fax[:.]|referred by|request form|clinical data|sample\(s\)|collection|received|test\(s\) ordered|notes?|remarks?|---?\s*end of laboratory report|flags\s+ref\s*interval)/iu', $line)) {
            return true;
        }

        if (preg_match('/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/', $line)) return true;

        return false;
    }

    private function parseLine(string $line): ?array
    {
        $line = preg_replace('/^\[\*\]\s*/u', '', $line) ?? $line;
        if ($payload = $this->parseQuantitativeLine($line)) return $payload;
        return $this->parseQualitativeLine($line);
    }

    private function parseQuantitativeLine(string $line): ?array
    {
        $number = '[<>≤≥]?\s*-?\d+(?:[.,]\d+)?';
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

        if (!preg_match($pattern, $line, $m)) return null;
        if (empty($m['unit']) && empty($m['flag']) && empty($m['low'])) return null;

        $name = $this->cleanTestName($m['name']);
        if (!$this->isPlausibleTestName($name)) return null;

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

        if (preg_match('/^(?<name>.+?)\s{2,}|\.{2,}\s*(?<value>.+)$/u', $line, $m)) {
            $candidates[] = [$m['name'], $m['value']];
        }
        if (preg_match('/^(?<name>[^:]{2,80}?)\s*[:\-]\s*(?<value>.+)$/u', $line, $m)) {
            $candidates[] = [$m['name'], $m['value']];
        }
        if (preg_match('/^(?<name>[A-Za-z][A-Za-z0-9 \.\-\/&()]{1,70}?)\s+(?<value>(?:Negative|Positive|Reactive|Non-?Reactive|Normal|Abnormal|Trace|Nil|Absent|Present|Seen|Not seen).*)$/iu', $line, $m)) {
            $candidates[] = [$m['name'], $m['value']];
        }

        foreach ($candidates as [$rawName, $rawValue]) {
            $name  = $this->cleanTestName($rawName);
            $value = trim($rawValue);

            if (!$this->isPlausibleTestName($name) || $value === '' || mb_strlen($value) > 120) continue;
            if (preg_match('/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/', $value)) continue;

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
        if ($name === '' || mb_strlen($name) > 100) return false;

        return preg_match('/[a-z]/i', $name) === 1
            && preg_match('/^\d+$/', $name) !== 1;
    }

    // =====================================================================
    // ORDERED-TESTS EXTRACTION (legacy, kept for compatibility)
    // =====================================================================

    public function extractOrderedTests(string $text): ?array
    {
        $text = $this->normaliseWhitespace($text);
        if ($text === '') return null;

        if (preg_match(
            '/tests?\s*(?:\(\s*s\s*\))?\s+ordered\s*:?\s*(.+?)(?=\n\s*(?:request form|clinical data|sample|collection|received|referred|malaria|hiv|full blood|flags|notes|$))/ius',
            $text,
            $m
        )) {
            $section = trim($m[1]);
        } elseif (preg_match(
            '/tests?\s*(?:\(\s*s\s*\))?\s+ordered\s*:?\s*\n\s*(.+?)(?=\n\s*(?:request form|clinical data|sample|collection|received|referred|malaria|hiv|full blood|flags|notes|$))/ius',
            $text,
            $m
        )) {
            $section = trim($m[1]);
        } elseif (preg_match(
            '/\b((?:FBC|CBC|Diff|Malaria|HIV|Hep\s*B|HBsAg|RPR|VDRL|LFT|RFT|TFT|ESR|CRP)(?:\s*[,\/]\s*(?:FBC|CBC|Diff|Malaria|HIV|Hep\s*B|HBsAg|RPR|VDRL|LFT|RFT|TFT|ESR|CRP))+)/i',
            $text,
            $m
        )) {
            $section = $m[1];
        } else {
            return null;
        }

        $section = preg_replace('/\s+/', ' ', $section);
        $tests   = preg_split('/\s*[,;\/]\s*/', $section, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $tests = array_values(array_filter(
            array_map(fn($t) => trim($t, " \t\n\r\0\x0B:;,-."), $tests),
            fn($t) => $t !== '' && mb_strlen($t) > 1
        ));

        return $tests !== [] ? $tests : null;
    }

    public function validateOrderedTests(string $text, array $selectedTests): array
    {
        $orderedTests = $this->extractOrderedTests($text);

        if ($orderedTests === null) {
            return [
                'valid'         => false,
                'status'        => 'verification_required',
                'message'       => 'Could not reliably extract the Test(s) Ordered section.',
                'ordered_tests' => [],
                'matched'       => [],
                'unmatched'     => $selectedTests,
            ];
        }

        $matched   = [];
        $unmatched = [];

        foreach ($selectedTests as $selected) {
            $selected = trim((string) $selected);
            if ($selected === '') continue;

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

            if ($isMatch) $matched[] = $selected;
            else          $unmatched[] = $selected;
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
