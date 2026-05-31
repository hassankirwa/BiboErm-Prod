<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'warehouse_id' => $this->warehouse_id,
            'slug' => $this->slug?->value ?? $this->slug,
            'name' => $this->name,
            'sort_order' => $this->sort_order,
            'sections' => SectionResource::collection($this->whenLoaded('sections')),
        ];
    }
}
