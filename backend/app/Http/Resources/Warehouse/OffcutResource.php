<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OffcutResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'offcut_number' => $this->offcut_number,
            'item_id' => $this->item_id,
            'bin_id' => $this->bin_id,
            'storage_area' => $this->storage_area?->value ?? $this->storage_area,
            'length_mm' => $this->length_mm,
            'quantity_pieces' => $this->quantity_pieces,
            'source_project_id' => $this->source_project_id,
            'status' => $this->status?->value ?? $this->status,
            'allocated_project_id' => $this->allocated_project_id,
            'logged_at' => $this->logged_at?->toIso8601String(),
            'notes' => $this->notes,
            'item' => new ItemResource($this->whenLoaded('item')),
            'bin' => new BinResource($this->whenLoaded('bin')),
        ];
    }
}
