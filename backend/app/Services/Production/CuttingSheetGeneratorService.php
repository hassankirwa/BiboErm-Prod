<?php

namespace App\Services\Production;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Production\CuttingSheet;
use App\Models\Production\ProductionOrder;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\User;
use App\Models\Warehouse\Item;
use App\Services\Projects\ProjectWaveService;
use App\Services\Warehouse\Reservations\AluminiumBarCutPacker;
use App\Services\Warehouse\Reservations\AluminiumBarDemandService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class CuttingSheetGeneratorService
{
    public function __construct(
        protected ProductionAuditLogger $audit,
        protected AluminiumBarDemandService $barDemand,
        protected AluminiumBarCutPacker $packer,
        protected ProjectWaveService $waves,
    ) {}

    /**
     * @return Collection<int, CuttingSheet>
     */
    public function generate(ProductionOrder $order, User $user, bool $replaceExisting = true)
    {
        return DB::transaction(function () use ($order, $user, $replaceExisting) {
            if ($replaceExisting) {
                CuttingSheet::query()
                    ->where('production_order_id', $order->id)
                    ->delete();
            }

            $bom = ProjectBom::query()
                ->where('project_id', $order->project_id)
                ->where('status', 'finalized')
                ->orderByDesc('finalized_at')
                ->first();

            if (! $bom) {
                return $order->cuttingSheets()->get();
            }

            $lines = ProjectBomLine::query()
                ->where('bom_id', $bom->id)
                ->where('is_procurement_only', false)
                ->whereNotNull('warehouse_item_id')
                ->where(function ($query) {
                    $query->where('line_type', 'aluminium_profile')
                        ->orWhereHas('warehouseItem', fn ($q) => $q->where('category', ItemCategory::AluminiumProfile->value));
                })
                ->with(['warehouseItem.aluminiumProfile', 'floor'])
                ->orderBy('sort_order')
                ->get();

            $order->loadMissing('wave');
            $floorLabels = $this->waves->floorLabelsForWave($order->wave);
            $waveId = $order->project_wave_id;
            if ($floorLabels !== []) {
                $normalized = array_map(fn ($label) => mb_strtolower(trim($label)), $floorLabels);
                $scoped = $lines->filter(function (ProjectBomLine $line) use ($normalized, $waveId) {
                    $floorLabel = $line->floor?->floor_label;
                    if ($floorLabel === null || trim((string) $floorLabel) === '') {
                        return $waveId === null;
                    }

                    return in_array(mb_strtolower(trim((string) $floorLabel)), $normalized, true);
                });

                if ($scoped->isNotEmpty()) {
                    $lines = $scoped->values();
                }
            }

            $sortOrder = 0;
            $generatedAt = now();

            // Nest by profile code (PY06/PY24/…) so uneven BOM lengths share beams —
            // same approach as Beatrice cutting lists — not one virgin bar per BOM line.
            $groups = $lines->groupBy(function (ProjectBomLine $line) {
                $code = strtoupper(trim((string) ($line->material_code ?: '')));
                if ($code !== '') {
                    return $code;
                }

                return 'ITEM:'.(int) $line->warehouse_item_id;
            });

            foreach ($groups as $profileCode => $itemLines) {
                $item = $this->resolveGroupItem($itemLines);
                if (! $item) {
                    continue;
                }

                $cuts = [];
                foreach ($itemLines as $line) {
                    $lengthMm = (int) ($line->measurement_mm ?? 0);
                    $quantity = max(0, (int) round((float) $line->quantity));
                    if ($lengthMm < 1 || $quantity < 1) {
                        continue;
                    }

                    for ($i = 0; $i < $quantity; $i++) {
                        $cuts[] = [
                            'project_bom_line_id' => $line->id,
                            'length_mm' => $lengthMm,
                        ];
                    }
                }

                if ($cuts === []) {
                    continue;
                }

                $barLengthMm = $this->barDemand->barLengthMm($item);
                $displayCode = str_starts_with((string) $profileCode, 'ITEM:')
                    ? ($itemLines->first()?->material_code ?? $item->sku)
                    : (string) $profileCode;

                foreach ($this->packer->packCuts($cuts, $barLengthMm) as $barNumber => $barCuts) {
                    $usedMm = array_sum(array_column($barCuts, 'length_mm'));

                    CuttingSheet::query()->create([
                        'production_order_id' => $order->id,
                        'project_bom_line_id' => $barCuts[0]['project_bom_line_id'],
                        'warehouse_item_id' => $item->id,
                        'bar_number' => $barNumber + 1,
                        'profile_code' => $displayCode,
                        'cut_length_mm' => $barCuts[0]['length_mm'],
                        'pieces' => count($barCuts),
                        'cuts' => $barCuts,
                        'planned_used_mm' => $usedMm,
                        'planned_waste_mm' => max(0, $barLengthMm - $usedMm),
                        'bar_length_mm' => $barLengthMm,
                        'waste_mm' => max(0, $barLengthMm - $usedMm),
                        'sort_order' => $sortOrder++,
                        'generated_at' => $generatedAt,
                        'generated_by' => $user->id,
                    ]);
                }
            }

            $sheets = $order->cuttingSheets()->with(['bomLine', 'warehouseItem.aluminiumProfile'])->get();

            if ($sheets->isNotEmpty()) {
                $this->audit->cuttingSheetGenerated($sheets->first(), [
                    'production_order_id' => $order->id,
                    'bar_count' => $sheets->count(),
                    'bom_id' => $bom->id,
                ]);
            }

            return $sheets;
        });
    }

    /**
     * Prefer the most common warehouse item in the profile group (stock identity).
     *
     * @param  Collection<int, ProjectBomLine>  $itemLines
     */
    private function resolveGroupItem(Collection $itemLines): ?Item
    {
        $itemId = $itemLines
            ->groupBy('warehouse_item_id')
            ->sortByDesc(fn (Collection $group) => $group->count())
            ->keys()
            ->first();

        if (! $itemId) {
            return null;
        }

        /** @var Item|null $item */
        $item = $itemLines->firstWhere('warehouse_item_id', $itemId)?->warehouseItem;

        return $item;
    }
}
