<?php
// app/Services/Budgets/BudgetResult.php

namespace App\Services\Budgets;

use App\Models\Budgets\BudgetAllocation;

final readonly class BudgetResult
{
    private function __construct(
        public bool $success,
        public string $message,
        public ?BudgetAllocation $budget = null,
        public array $context = [],
    ) {}

    public static function ok(string $message, BudgetAllocation $budget, array $context = []): self
    {
        return new self(true, $message, $budget, $context);
    }

    public static function fail(string $message, array $context = []): self
    {
        return new self(false, $message, null, $context);
    }
}
