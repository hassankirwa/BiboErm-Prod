<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'category' => $this->category?->value ?? $this->category,
            'unit_of_measure' => $this->unit_of_measure,
            'door_type_id' => $this->door_type_id,
            'min_stock_qty' => $this->min_stock_qty,
            'is_active' => $this->is_active,
            'catalog_tier' => $this->catalog_tier,
            'description' => $this->description,
            'image_url' => $this->imageUrl(),
            'catalog_metadata' => $this->catalog_metadata,
            'aluminium_profile' => $this->whenLoaded('aluminiumProfile'),
            'accessory' => $this->whenLoaded('accessory'),
            'rubber' => $this->whenLoaded('rubber'),
            'door_type' => new DoorTypeResource($this->whenLoaded('doorType')),
        ];
    }

    protected function imageUrl(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
            return $this->image_path;
        }

        $normalized = ltrim(str_replace('\\', '/', $this->image_path), '/');
        if (str_starts_with($normalized, 'public/')) {
            $normalized = substr($normalized, 7);
        }

        return \App\Support\BiboStorage::publicUrlPrefix().'/'.$normalized;
    }
}
