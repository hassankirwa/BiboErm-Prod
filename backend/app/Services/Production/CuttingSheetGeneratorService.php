<?php

namespace App\Services\Production;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Production\CuttingSheet;
use App\Models\Production\ProductionOrder;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class CuttingSheetGeneratorService
{
    public function __construct(
        protected ProductionAuditLogger $audit,
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
                ->orderBy('sort_order')
                ->get();

            $sortOrder = 0;
            $generatedAt = now();

            foreach ($lines as $line) {
                $pieces = max(1, (int) round((float) $line->quantity));
                $cutLength = (int) ($line->measurement_mm ?? 0);

                if ($cutLength < 1 || ! $line->warehouse_item_id) {
                    continue;
                }

                CuttingSheet::query()->create([
                    'production_order_id' => $order->id,
                    'project_bom_line_id' => $line->id,
                    'warehouse_item_id' => $line->warehouse_item_id,
                    'profile_code' => $line->material_code ?? 'PROFILE',
                    'cut_length_mm' => $cutLength,
                    'pieces' => $pieces,
                    'sort_order' => $sortOrder++,
                    'generated_at' => $generatedAt,
                    'generated_by' => $user->id,
                ]);
            }

            $sheets = $order->cuttingSheets()->with(['bomLine', 'warehouseItem'])->get();

            if ($sheets->isNotEmpty()) {
                $this->audit->cuttingSheetGenerated($sheets->first(), [
                    'production_order_id' => $order->id,
                    'line_count' => $sheets->count(),
                    'bom_id' => $bom->id,
                ]);
            }

            return $sheets;
        });
    }
}
