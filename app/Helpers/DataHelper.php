<?php

namespace App\Helpers;

class DataHelper
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

        if ($this->decodedData === null && json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON data: ' . json_last_error_msg());
        }

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

    public function getField(string $field, int $index = 0): mixed
    {
        return $this->decodedData[$index][$field] ?? null;
    }

    public function getId(int $index = 0): ?string
    {
        return $this->getField('id', $index);
    }

    public function count(): int
    {
        return count($this->decodedData);
    }

    public function toJson(): string
    {
        return json_encode($this->decodedData);
    }
}
