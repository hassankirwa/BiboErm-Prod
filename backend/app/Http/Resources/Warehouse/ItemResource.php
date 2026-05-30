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
            'aluminium_profile' => $this->whenLoaded('aluminiumProfile'),
            'accessory' => $this->whenLoaded('accessory'),
            'rubber' => $this->whenLoaded('rubber'),
            'door_type' => new DoorTypeResource($this->whenLoaded('doorType')),
        ];
    }
}
