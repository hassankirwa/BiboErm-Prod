<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'from_bin_id' => $this->from_bin_id,
            'to_bin_id' => $this->to_bin_id,
            'quantity' => $this->quantity,
            'unit_cost' => $this->unit_cost,
            'item' => new ItemResource($this->whenLoaded('item')),
            'from_bin' => $this->whenLoaded('fromBin', fn () => $this->fromBin ? [
                'id' => $this->fromBin->id,
                'code' => $this->fromBin->code,
                'name' => $this->fromBin->name,
            ] : null),
            'to_bin' => $this->whenLoaded('toBin', fn () => $this->toBin ? [
                'id' => $this->toBin->id,
                'code' => $this->toBin->code,
                'name' => $this->toBin->name,
            ] : null),
        ];
    }
}
