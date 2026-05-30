<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockReservationLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'bin_id' => $this->bin_id,
            'quantity_reserved' => $this->quantity_reserved,
            'quantity_released' => $this->quantity_released,
            'quantity_remaining' => $this->remainingQuantity(),
            'bom_line_ref' => $this->bom_line_ref,
            'item' => new ItemResource($this->whenLoaded('item')),
            'bin' => new BinResource($this->whenLoaded('bin')),
        ];
    }
}
