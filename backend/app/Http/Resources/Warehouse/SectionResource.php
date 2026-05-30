<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'deck_id' => $this->deck_id,
            'door_type_id' => $this->door_type_id,
            'code' => $this->code,
            'name' => $this->name,
            'section_type' => $this->section_type?->value ?? $this->section_type,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'bins' => BinResource::collection($this->whenLoaded('bins')),
            'door_type' => new DoorTypeResource($this->whenLoaded('doorType')),
        ];
    }
}
