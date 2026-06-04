<?php

namespace App\Http\Resources\Production;

use App\Models\Production\ProductionStageLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProductionStageLog */
class ProductionStageLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'production_order_id' => $this->production_order_id,
            'stage' => $this->stage?->value,
            'stage_label' => $this->stage?->label(),
            'status' => $this->status,
            'completed_by' => $this->completed_by,
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'notes' => $this->notes,
        ];
    }
}
