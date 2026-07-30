<?php

namespace App\Http\Resources\Production;

use App\Models\Production\CuttingSheet;
use App\Services\Warehouse\Reservations\AluminiumBarDemandService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CuttingSheet */
class CuttingSheetResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing('warehouseItem.aluminiumProfile');
        $item = $this->warehouseItem;
        $expectedBar = $item
            ? app(AluminiumBarDemandService::class)->barLengthMm($item)
            : AluminiumBarDemandService::DEFAULT_BAR_LENGTH_MM;
        $cuts = $this->cuts;
        $usedMm = $this->planned_used_mm;
        if ($usedMm === null) {
            $usedMm = is_array($cuts) && $cuts !== []
                ? array_sum(array_map(
                    fn (array $cut) => (int) ($cut['length_mm'] ?? 0),
                    $cuts,
                ))
                : (int) $this->cut_length_mm * (int) $this->pieces;
        }
        $cuts ??= [[
            'project_bom_line_id' => $this->project_bom_line_id,
            'length_mm' => (int) $this->cut_length_mm,
        ]];

        return [
            'id' => $this->id,
            'production_order_id' => $this->production_order_id,
            'project_bom_line_id' => $this->project_bom_line_id,
            'warehouse_item_id' => $this->warehouse_item_id,
            'profile_code' => $this->profile_code,
            'bar_number' => $this->bar_number ?? 1,
            'cuts' => $cuts,
            'cut_length_mm' => $this->cut_length_mm,
            'pieces' => $this->pieces,
            'needed_mm' => $usedMm,
            'planned_used_mm' => $usedMm,
            'planned_waste_mm' => $this->planned_waste_mm,
            'expected_bar_length_mm' => $expectedBar,
            'bar_length_mm' => $this->bar_length_mm,
            'waste_mm' => $this->waste_mm,
            'sort_order' => $this->sort_order,
            'generated_at' => $this->generated_at?->toIso8601String(),
        ];
    }
}
