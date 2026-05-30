<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'movement_number' => $this->movement_number,
            'movement_type' => $this->movement_type?->value ?? $this->movement_type,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'notes' => $this->notes,
            'performed_by' => $this->performed_by,
            'performed_at' => $this->performed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'lines' => StockMovementLineResource::collection($this->whenLoaded('lines')),
            'performer' => $this->whenLoaded('performer', fn () => [
                'id' => $this->performer->id,
                'name' => $this->performer->name,
            ]),
        ];
    }
}
