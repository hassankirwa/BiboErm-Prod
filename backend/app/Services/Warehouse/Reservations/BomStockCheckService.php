<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockReservation;
use App\Services\Warehouse\Inventory\StockLevelCalculator;
use App\Services\Warehouse\Offcuts\OffcutAllocationService;

class BomStockCheckService
{
    public function __construct(
        protected StockLevelCalculator $stockLevels,
        protected OffcutAllocationService $offcutAllocation,
        protected FifoSequenceResolver $fifoSequence,
        protected FifoQueueDemandRegistry $demandRegistry,
    ) {}

    /**
     * @param  array<int, array{item_id: int, quantity: string|float, bom_line_ref?: string|null, required_length_mm?: int|null, project_bom_line_id?: int|null}>  $bomLines
     * @return array{lines: list<array<string, mixed>>, can_fully_reserve: bool}
     */
    public function check(int $projectId, array $bomLines): array
    {
        $results = [];
        $canFullyReserve = true;

        foreach ($bomLines as $bomLine) {
            $item = Item::query()->findOrFail($bomLine['item_id']);
            $required = (string) $bomLine['quantity'];

            $onHand = $this->stockLevels->totalOnHand($item);
            $reserved = $this->stockLevels->totalReserved($item);
            $available = $this->stockLevels->availableForItem($item);

            $offcutUsable = '0';

            if ($item->category === ItemCategory::AluminiumProfile) {
                $offcutUsable = $this->offcutAllocation->totalUsableMetres(
                    $item->id,
                    (int) ($bomLine['required_length_mm'] ?? 0)
                );
            }

            $aheadDemand = $this->aheadUnreservedDemand($projectId, $item->id);
            $effectiveAvailable = bcsub(bcadd($available, $offcutUsable, 3), $aheadDemand, 3);

            if (bccomp($effectiveAvailable, '0', 3) < 0) {
                $effectiveAvailable = '0.000';
            }

            $shortage = bccomp($required, $effectiveAvailable, 3) === 1
                ? bcsub($required, $effectiveAvailable, 3)
                : '0.000';

            if (bccomp($shortage, '0', 3) === 1) {
                $canFullyReserve = false;
            }

            $results[] = [
                'item_id' => $item->id,
                'project_bom_line_id' => $bomLine['project_bom_line_id'] ?? null,
                'sku' => $item->sku,
                'name' => $item->name,
                'bom_line_ref' => $bomLine['bom_line_ref'] ?? null,
                'required' => $required,
                'on_hand' => $onHand,
                'reserved_by_others' => $reserved,
                'available' => $available,
                'offcut_usable' => $offcutUsable,
                'ahead_unreserved_demand' => $aheadDemand,
                'effective_available' => $effectiveAvailable,
                'shortage' => $shortage,
            ];
        }

        return [
            'project_id' => $projectId,
            'lines' => $results,
            'can_fully_reserve' => $canFullyReserve,
        ];
    }

    public function preferredBinIdForItem(Item $item): ?int
    {
        if ($item->category === ItemCategory::Accessory) {
            return \App\Models\Warehouse\Accessory::query()->where('item_id', $item->id)->value('default_bin_id');
        }

        return null;
    }

    protected function aheadUnreservedDemand(int $projectId, int $itemId): string
    {
        $demand = '0.000';

        foreach ($this->fifoSequence->projectIdsAheadOf($projectId) as $aheadProjectId) {
            if ($this->hasActiveReservation($aheadProjectId)) {
                continue;
            }

            $demand = bcadd($demand, $this->demandRegistry->demandForItem($aheadProjectId, $itemId), 3);
        }

        return $demand;
    }

    protected function hasActiveReservation(int $projectId): bool
    {
        return StockReservation::query()
            ->where('project_id', $projectId)
            ->whereIn('status', [
                ReservationStatus::Pending,
                ReservationStatus::Partial,
            ])
            ->exists();
    }
}
