<?php
// app/Services/Budgets/Exceptions/InsufficientBudget.php

namespace App\Services\Budgets\Exceptions;

class InsufficientBudget extends \RuntimeException
{
    public function __construct(
        public readonly string $bucket,
        public readonly float $required,
        public readonly float $available,
    ) {
        parent::__construct(sprintf(
            'Insufficient %s: required %s, available %s',
            $bucket,
            number_format($required, 2),
            number_format($available, 2)
        ));
    }

    public function shortfall(): float
    {
        return round($this->required - $this->available, 2);
    }
}
