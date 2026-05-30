<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reservation_number' => $this->reservation_number,
            'project_id' => $this->project_id,
            'status' => $this->status?->value ?? $this->status,
            'reserved_at' => $this->reserved_at?->toIso8601String(),
            'reserved_by' => $this->reserved_by,
            'fifo_sequence' => $this->fifo_sequence,
            'notes' => $this->notes,
            'lines' => StockReservationLineResource::collection($this->whenLoaded('lines')),
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'reference' => $this->project->reference,
                'name' => $this->project->name,
            ]),
        ];
    }
}
