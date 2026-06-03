<?php

namespace App\Http\Resources\Production;

use App\Models\Production\CuttingSheet;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CuttingSheet */
class CuttingSheetResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'production_order_id' => $this->production_order_id,
            'project_bom_line_id' => $this->project_bom_line_id,
            'warehouse_item_id' => $this->warehouse_item_id,
            'profile_code' => $this->profile_code,
            'cut_length_mm' => $this->cut_length_mm,
            'pieces' => $this->pieces,
            'bar_length_mm' => $this->bar_length_mm,
            'waste_mm' => $this->waste_mm,
            'sort_order' => $this->sort_order,
            'generated_at' => $this->generated_at?->toIso8601String(),
        ];
    }
}
