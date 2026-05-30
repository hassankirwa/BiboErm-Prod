<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockLevelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'bin_id' => $this->bin_id,
            'quantity_on_hand' => $this->quantity_on_hand,
            'quantity_reserved' => $this->quantity_reserved,
            'quantity_available' => $this->availableQuantity(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'item' => new ItemResource($this->whenLoaded('item')),
            'bin' => new BinResource($this->whenLoaded('bin')),
            'location' => $this->when(
                $this->relationLoaded('bin') && $this->bin?->relationLoaded('section'),
                fn () => [
                    'section' => $this->bin->section ? [
                        'id' => $this->bin->section->id,
                        'code' => $this->bin->section->code,
                        'name' => $this->bin->section->name,
                    ] : null,
                    'deck' => $this->bin->section?->deck ? [
                        'id' => $this->bin->section->deck->id,
                        'slug' => $this->bin->section->deck->slug?->value ?? $this->bin->section->deck->slug,
                        'name' => $this->bin->section->deck->name,
                    ] : null,
                ]
            ),
        ];
    }
}
