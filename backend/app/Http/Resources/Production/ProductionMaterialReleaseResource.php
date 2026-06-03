<?php

namespace App\Http\Resources\Production;

use App\Models\Production\ProductionMaterialRelease;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProductionMaterialRelease */
class ProductionMaterialReleaseResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'production_order_id' => $this->production_order_id,
            'stock_reservation_line_id' => $this->stock_reservation_line_id,
            'stage' => $this->stage?->value,
            'qty_released' => $this->qty_released,
            'released_at' => $this->released_at?->toIso8601String(),
            'released_by' => $this->released_by,
            'stock_movement_id' => $this->stock_movement_id,
            'notes' => $this->notes,
        ];
    }
}
