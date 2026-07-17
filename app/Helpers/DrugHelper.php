<?php

namespace App\Helpers;

class DrugHelper
{
    private array $data;
    private array $decodedData;

    public function __construct(?string $jsonData = null)
    {
        if ($jsonData) {
            $this->setData($jsonData);
        }
    }

    public function setData(string $jsonData): self
    {
        $this->data = $jsonData;
        $this->decodedData = json_decode($jsonData, true);
        return $this;
    }

    public function getAll(): array
    {
        return $this->decodedData;
    }

    public function get(int $index = 0): ?array
    {
        return $this->decodedData[$index] ?? null;
    }

    public function getId(int $index = 0): ?string
    {
        return $this->decodedData[$index]['id'] ?? null;
    }

    public function getDrugName(int $index = 0): ?string
    {
        return $this->decodedData[$index]['drugName'] ?? null;
    }

    public function count(): int
    {
        return count($this->decodedData);
    }
}
