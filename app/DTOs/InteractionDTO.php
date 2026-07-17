<?php

namespace App\DTOs;

use App\Models\Patients\Interaction;

class InteractionDTO
{
    public function __construct(
        public readonly int $id,
        public readonly ?string $interaction_uuid,
        public readonly string $type,
        public readonly string $type_label,
        public readonly string $description,
        public readonly ?string $provider_name,
        public readonly string $status,
        public readonly string $status_label,
        public readonly ?string $reference_number,
        public readonly string $created_at,
        public readonly ?string $date, // For backward compatibility
    ) {}

    public static function fromModel(Interaction $interaction): self
    {
        return new self(
            id: $interaction->id,
            interaction_uuid: $interaction->interaction_uuid,
            type: $interaction->type,
            type_label: $interaction->type_label,
            description: $interaction->description,
            provider_name: $interaction->provider?->name ?? 'System',
            status: $interaction->status,
            status_label: $interaction->status_label,
            reference_number: $interaction->reference_number,
            created_at: $interaction->created_at->toISOString(),
            date: $interaction->created_at->format('Y-m-d'),
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'interaction_uuid' => $this->interaction_uuid,
            'type' => $this->type,
            'type_label' => $this->type_label,
            'description' => $this->description,
            'provider_name' => $this->provider_name,
            'status' => $this->status,
            'status_label' => $this->status_label,
            'reference_number' => $this->reference_number,
            'created_at' => $this->created_at,
            'date' => $this->date,
        ];
    }
}
