<?php
// app/Helpers/NumberGenerator.php

namespace App\Helpers;

use Illuminate\Support\Str;
use App\Models\BulkStores\PurchaseRequisition;

class NumberGenerator
{
    // Static counters for batch generation
    private static $batchCounters = [];

    /**
     * Generate a unique transaction number with proper incrementing
     */
    public static function generate(
        string $prefix,
        string $model,
        string $format = 'default',
        array $options = []
    ): string {
        $method = 'generate' . ucfirst($format);

        if (method_exists(self::class, $method)) {
            return self::$method($prefix, $model, $options);
        }

        return self::generateDefault($prefix, $model);
    }

    /**
     * Generate Purchase Requisition Number
     * Format: PR-YYYY-00001
     */
    public static function generatePRNumber(): string
    {
        $year = date('Y');
        $model = PurchaseRequisition::class;
        $field = 'pr_number';
        $length = 8;
        $separator = '-';

        $last = $model::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        if ($last && property_exists($last, $field) && $last->$field) {
            $lastNumber = self::extractSequence($last->$field, $length);
            $sequence = str_pad(($lastNumber ?? 0) + 1, $length, '0', STR_PAD_LEFT);
        } else {
            $sequence = rand(1111,9999);
        }

        return "PR{$separator}{$year}{$separator}{$sequence}";
    }

    /**
     * Generate a budget code with batch support
     */
    public static function generateBudgetCode(string $prefix = 'BUD'): string
    {
        $year = date('Y');
        $model = 'App\\Models\\Budgets\\BudgetAllocation';
        $field = 'budget_code';
        $length = 5;

        // Check if we have a batch counter for this prefix/year
        $counterKey = "{$prefix}-{$year}";

        if (isset(self::$batchCounters[$counterKey])) {
            $sequence = str_pad(self::$batchCounters[$counterKey], $length, '0', STR_PAD_LEFT);
            self::$batchCounters[$counterKey]++;
            return "{$prefix}-{$year}-{$sequence}";
        }

        // Get the last record from database
        $last = $model::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        $startNumber = 1;
        if ($last && property_exists($last, $field) && $last->$field) {
            $lastNumber = self::extractSequence($last->$field, $length);
            $startNumber = ($lastNumber ?? 0) + 1;
        }

        self::$batchCounters[$counterKey] = $startNumber;
        $sequence = str_pad($startNumber, $length, '0', STR_PAD_LEFT);
        self::$batchCounters[$counterKey]++;

        return "{$prefix}-{$year}-{$sequence}";
    }

    /**
     * Generate multiple unique budget codes in batch
     */
    public static function generateBudgetCodes(int $count, string $prefix = 'BUD'): array
    {
        $codes = [];
        $year = date('Y');
        $model = 'App\\Models\\Budgets\\BudgetAllocation';
        $field = 'budget_code';
        $length = 5;

        // Get the last sequence from database
        $last = $model::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        $startNumber = 1;
        if ($last && property_exists($last, $field) && $last->$field) {
            $lastNumber = self::extractSequence($last->$field, $length);
            $startNumber = ($lastNumber ?? 0) + 1;
        }

        // Generate codes
        for ($i = 0; $i < $count; $i++) {
            $sequence = str_pad($startNumber + $i, $length, '0', STR_PAD_LEFT);
            $codes[] = "{$prefix}-{$year}-{$sequence}";
        }

        return $codes;
    }

    /**
     * Custom format with field specification and batch support
     */
    public static function generateCustom(string $prefix, string $model, array $options = []): string
    {
        $field = $options['field'] ?? 'transaction_no';
        $length = $options['length'] ?? 5;
        $separator = $options['separator'] ?? '-';
        $resetOn = $options['reset_on'] ?? null;
        $includeDate = $options['include_date'] ?? false;
        $dateFormat = $options['date_format'] ?? 'Ym';
        $resetField = $options['reset_field'] ?? null;
        $resetValue = $options['reset_value'] ?? null;

        // Build counter key
        $datePart = $includeDate ? date($dateFormat) : '';
        $counterKey = "{$prefix}-{$datePart}";

        // Check if we have a batch counter
        if (isset(self::$batchCounters[$counterKey])) {
            $sequence = str_pad(self::$batchCounters[$counterKey], $length, '0', STR_PAD_LEFT);
            self::$batchCounters[$counterKey]++;

            $parts = [$prefix];
            if ($includeDate) {
                $parts[] = $datePart;
            }
            $parts[] = $sequence;
            return implode($separator, $parts);
        }

        // Get the last record from database
        $query = $model::query();

        if ($resetOn === 'year') {
            $query->whereYear('created_at', date('Y'));
        } elseif ($resetOn === 'month') {
            $query->whereYear('created_at', date('Y'))
                ->whereMonth('created_at', date('m'));
        } elseif ($resetOn === 'day') {
            $query->whereDate('created_at', date('Y-m-d'));
        }

        if ($resetField && $resetValue) {
            $query->where($resetField, $resetValue);
        }

        $last = $query->orderBy('id', 'desc')->first();

        // Get start number
        $startNumber = 1;
        if ($last && property_exists($last, $field) && $last->$field) {
            $lastNumber = self::extractSequence($last->$field, $length);
            $startNumber = ($lastNumber ?? 0) + 1;
        }

        // Store in batch counter
        self::$batchCounters[$counterKey] = $startNumber;
        $sequence = str_pad($startNumber, $length, '0', STR_PAD_LEFT);
        self::$batchCounters[$counterKey]++;

        // Build the number
        $parts = [$prefix];
        if ($includeDate) {
            $parts[] = $datePart;
        }
        $parts[] = $sequence;

        return implode($separator, $parts);
    }

    /**
     * Reset all batch counters
     */
    public static function resetBatchCounters(): void
    {
        self::$batchCounters = [];
    }

    /**
     * Reset specific batch counter
     */
    public static function resetBatchCounter(string $key): void
    {
        unset(self::$batchCounters[$key]);
    }

    /**
     * Get current batch counters
     */
    public static function getBatchCounters(): array
    {
        return self::$batchCounters;
    }

    /**
     * Default format: PREFIX-YYYYMM-00001
     */
    public static function generateDefault(string $prefix, string $model): string
    {
        $year = date('Y');
        $month = date('m');
        $counterKey = "{$prefix}-{$year}{$month}";

        if (isset(self::$batchCounters[$counterKey])) {
            $sequence = str_pad(self::$batchCounters[$counterKey], 5, '0', STR_PAD_LEFT);
            self::$batchCounters[$counterKey]++;
            return "{$prefix}-{$year}{$month}-{$sequence}";
        }

        $last = self::getLastRecord($model, $year, $month);

        $startNumber = 1;
        if ($last && property_exists($last, 'transaction_no')) {
            $lastNumber = self::extractSequence($last->transaction_no, 5);
            $startNumber = ($lastNumber ?? 0) + 1;
        }

        self::$batchCounters[$counterKey] = $startNumber;
        $sequence = str_pad($startNumber, 5, '0', STR_PAD_LEFT);
        self::$batchCounters[$counterKey]++;

        return "{$prefix}-{$year}{$month}-{$sequence}";
    }

    /**
     * Monthly reset format
     */
    public static function generateMonthly(string $prefix, string $model, array $options = []): string
    {
        return self::generateDefault($prefix, $model);
    }

    /**
     * Yearly format
     */
    public static function generateYearly(string $prefix, string $model, array $options = []): string
    {
        $year = date('Y');
        $counterKey = "{$prefix}-{$year}";

        if (isset(self::$batchCounters[$counterKey])) {
            $sequence = str_pad(self::$batchCounters[$counterKey], 5, '0', STR_PAD_LEFT);
            self::$batchCounters[$counterKey]++;
            return "{$prefix}-{$year}-{$sequence}";
        }

        $last = self::getLastRecord($model, $year);

        $startNumber = 1;
        if ($last && property_exists($last, 'transaction_no')) {
            $lastNumber = self::extractSequence($last->transaction_no, 5);
            $startNumber = ($lastNumber ?? 0) + 1;
        }

        self::$batchCounters[$counterKey] = $startNumber;
        $sequence = str_pad($startNumber, 5, '0', STR_PAD_LEFT);
        self::$batchCounters[$counterKey]++;

        return "{$prefix}-{$year}-{$sequence}";
    }

    /**
     * Dated format
     */
    public static function generateDated(string $prefix, string $model, array $options = []): string
    {
        $date = date('Ymd');
        $counterKey = "{$prefix}-{$date}";

        if (isset(self::$batchCounters[$counterKey])) {
            $sequence = str_pad(self::$batchCounters[$counterKey], 5, '0', STR_PAD_LEFT);
            self::$batchCounters[$counterKey]++;
            return "{$prefix}-{$date}-{$sequence}";
        }

        $last = self::getLastRecord($model, null, null, $date);

        $startNumber = 1;
        if ($last && property_exists($last, 'transaction_no')) {
            $lastNumber = self::extractSequence($last->transaction_no, 5);
            $startNumber = ($lastNumber ?? 0) + 1;
        }

        self::$batchCounters[$counterKey] = $startNumber;
        $sequence = str_pad($startNumber, 5, '0', STR_PAD_LEFT);
        self::$batchCounters[$counterKey]++;

        return "{$prefix}-{$date}-{$sequence}";
    }

    /**
     * Prefix only format
     */
    public static function generatePrefix(string $prefix, string $model, array $options = []): string
    {
        $counterKey = $prefix;

        if (isset(self::$batchCounters[$counterKey])) {
            $sequence = str_pad(self::$batchCounters[$counterKey], 5, '0', STR_PAD_LEFT);
            self::$batchCounters[$counterKey]++;
            return "{$prefix}-{$sequence}";
        }

        $last = $model::orderBy('id', 'desc')->first();

        $startNumber = 1;
        if ($last && property_exists($last, 'transaction_no')) {
            $lastNumber = self::extractSequence($last->transaction_no, 5);
            $startNumber = ($lastNumber ?? 0) + 1;
        }

        self::$batchCounters[$counterKey] = $startNumber;
        $sequence = str_pad($startNumber, 5, '0', STR_PAD_LEFT);
        self::$batchCounters[$counterKey]++;

        return "{$prefix}-{$sequence}";
    }

    /**
     * Generate a batch number
     */
    public static function batchNumber(?string $productCode = null, ?string $date = null, ?int $counter = null): string
    {
        $date = $date ?? date('Ymd');
        $counter = $counter ?? rand(1000, 9999);
        $prefix = $productCode ? strtoupper(substr($productCode, 0, 4)) : 'BATCH';

        return "{$prefix}-{$date}-{$counter}";
    }

    /**
     * Generate random alphanumeric code
     */
    public static function randomCode(string $prefix = '', int $length = 8, bool $uppercase = true): string
    {
        $code = Str::random($length);
        if ($uppercase) {
            $code = strtoupper($code);
        }
        return $prefix ? $prefix . '-' . $code : $code;
    }

    /**
     * Generate a unique reference number
     */
    public static function reference(string $prefix = 'REF', int $length = 8, ?string $model = null): string
    {
        do {
            $reference = $prefix . '-' . strtoupper(Str::random($length));
        } while ($model && $model::where('reference', $reference)->exists());

        return $reference;
    }

    /**
     * Generate serial number
     */
    public static function serialNumber(string $prefix = 'SN', int $length = 6): string
    {
        return $prefix . '-' . strtoupper(Str::random($length));
    }

    /**
     * Get the last record for a model with date filters
     */
    private static function getLastRecord(string $model, ?string $year = null, ?string $month = null, ?string $date = null)
    {
        $query = $model::query();

        if ($year) {
            $query->whereYear('created_at', $year);
        }

        if ($month) {
            $query->whereMonth('created_at', $month);
        }

        if ($date) {
            $query->whereDate('created_at', $date);
        }

        return $query->orderBy('id', 'desc')->first();
    }

    /**
     * Extract sequence number from a generated number
     */
    public static function extractSequence(string $number, int $length = 5): ?int
    {
        if (preg_match('/-(\d{' . $length . '})$/', $number, $matches)) {
            return (int) $matches[1];
        }
        return null;
    }

    /**
     * Extract prefix from a generated number
     */
    public static function extractPrefix(string $number): ?string
    {
        if (preg_match('/^([A-Z]{2,5})/', $number, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Extract date from a generated number
     */
    public static function extractDate(string $number): ?string
    {
        if (preg_match('/(\d{4,8})/', $number, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Validate a number format
     */
    public static function validateFormat(string $number, string $pattern = '/^[A-Z]{2,5}-\d{4,8}-\d{3,6}$/'): bool
    {
        return preg_match($pattern, $number) === 1;
    }
}
