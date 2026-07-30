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
        protected AluminiumBarDemandService $aluminiumDemand,
    ) {}

    /**
     * @param  array<int, array{item_id: int, quantity: string|float, bom_line_ref?: string|null, required_length_mm?: int|null, project_bom_line_id?: int|null}>  $bomLines
     * @return array{project_id: int, lines: list<array<string, mixed>>, can_fully_reserve: bool, aluminium_plans?: array<int, array<string, mixed>>}
     */
    public function check(int $projectId, array $bomLines): array
    {
        $results = [];
        $canFullyReserve = true;

        $itemIds = array_values(array_unique(array_map(
            fn (array $line) => (int) $line['item_id'],
            $bomLines
        )));

        $items = Item::query()
            ->whereIn('id', $itemIds)
            ->with('aluminiumProfile')
            ->get()
            ->keyBy('id');

        $totals = $this->stockLevels->totalsForItemIds($itemIds);
        $aheadProjectIds = $this->fifoSequence->projectIdsAheadOf($projectId);
        $activeReservationProjectIds = $this->activeReservationProjectIds($aheadProjectIds);

        $aluminiumPlans = $this->aluminiumDemand->plansByItemId($items, $bomLines);
        $aluminiumHandled = [];

        foreach ($bomLines as $bomLine) {
            $itemId = (int) $bomLine['item_id'];
            $item = $items->get($itemId);
            if (! $item) {
                throw (new \Illuminate\Database\Eloquent\ModelNotFoundException)->setModel(Item::class, [$itemId]);
            }

            // Aluminium: one aggregated check per SKU (bar packing spans all BOM lines).
            if ($item->category === ItemCategory::AluminiumProfile) {
                if (isset($aluminiumHandled[$itemId])) {
                    continue;
                }
                $aluminiumHandled[$itemId] = true;

                $plan = $aluminiumPlans[$itemId];
                $itemTotals = $totals[$itemId] ?? [
                    'on_hand' => '0.000',
                    'reserved' => '0.000',
                    'available' => '0.000',
                ];

                $required = (string) $plan['reserve_qty'];
                $onHand = $itemTotals['on_hand'];
                $reserved = $itemTotals['reserved'];
                $available = $itemTotals['available'];
                $offcutUsable = (string) $plan['offcut_usable_metres'];

                $aheadDemand = $this->aheadUnreservedDemand(
                    $aheadProjectIds,
                    $activeReservationProjectIds,
                    $item->id
                );

                // Offcuts cover cuts outside virgin stock; effective virgin need is reserve_qty only.
                $effectiveAvailable = bcsub($available, $aheadDemand, 3);
                if (bccomp($effectiveAvailable, '0', 3) < 0) {
                    $effectiveAvailable = '0.000';
                }

                $shortage = bccomp($required, $effectiveAvailable, 3) === 1
                    ? bcsub($required, $effectiveAvailable, 3)
                    : '0.000';

                if (bccomp($shortage, '0', 3) === 1) {
                    $canFullyReserve = false;
                }

                $bomLinesForItem = array_values(array_filter(
                    $bomLines,
                    fn (array $line) => (int) $line['item_id'] === $itemId,
                ));
                $primaryBomLineId = $bomLinesForItem[0]['project_bom_line_id'] ?? null;

                $results[] = [
                    'item_id' => $item->id,
                    'project_bom_line_id' => $primaryBomLineId,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'category' => $item->category?->value ?? $item->category,
                    'bom_line_ref' => $primaryBomLineId !== null ? (string) $primaryBomLineId : null,
                    'bom_line_ids' => array_values(array_filter(array_map(
                        fn (array $line) => $line['project_bom_line_id'] ?? null,
                        $bomLinesForItem,
                    ))),
                    'required' => $required,
                    'required_cuts' => $plan['cuts_total'],
                    'bars_needed' => $plan['bars_needed'],
                    'bar_length_mm' => $plan['bar_length_mm'],
                    'on_hand' => $onHand,
                    'reserved_by_others' => $reserved,
                    'available' => $available,
                    'offcut_usable' => $offcutUsable,
                    'offcut_piece_ids' => $plan['offcut_piece_ids'],
                    'ahead_unreserved_demand' => $aheadDemand,
                    'effective_available' => $effectiveAvailable,
                    'shortage' => $shortage,
                    'aluminium_plan' => $plan,
                ];

                continue;
            }

            $required = (string) $bomLine['quantity'];
            $itemTotals = $totals[$itemId] ?? [
                'on_hand' => '0.000',
                'reserved' => '0.000',
                'available' => '0.000',
            ];

            $onHand = $itemTotals['on_hand'];
            $reserved = $itemTotals['reserved'];
            $available = $itemTotals['available'];
            $offcutUsable = '0.000';

            $aheadDemand = $this->aheadUnreservedDemand(
                $aheadProjectIds,
                $activeReservationProjectIds,
                $item->id
            );
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
                'category' => $item->category?->value ?? $item->category,
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
            'aluminium_plans' => $aluminiumPlans,
        ];
    }

    public function preferredBinIdForItem(Item $item): ?int
    {
        if ($item->category === ItemCategory::Accessory) {
            return \App\Models\Warehouse\Accessory::query()->where('item_id', $item->id)->value('default_bin_id');
        }

        if ($item->category === ItemCategory::AluminiumProfile) {
            return \App\Models\Warehouse\AluminiumProfile::query()->where('item_id', $item->id)->value('default_bin_id');
        }

        return null;
    }

    /**
     * @param  list<int>  $aheadProjectIds
     * @param  array<int, true>  $activeReservationProjectIds
     */
    protected function aheadUnreservedDemand(
        array $aheadProjectIds,
        array $activeReservationProjectIds,
        int $itemId,
    ): string {
        $demand = '0.000';

        foreach ($aheadProjectIds as $aheadProjectId) {
            if (isset($activeReservationProjectIds[$aheadProjectId])) {
                continue;
            }

            $demand = bcadd($demand, $this->demandRegistry->demandForItem($aheadProjectId, $itemId), 3);
        }

        return $demand;
    }

    /**
     * @param  list<int>  $projectIds
     * @return array<int, true>
     */
    protected function activeReservationProjectIds(array $projectIds): array
    {
        if ($projectIds === []) {
            return [];
        }

        return StockReservation::query()
            ->whereIn('project_id', $projectIds)
            ->whereIn('status', [
                ReservationStatus::Pending,
                ReservationStatus::Partial,
            ])
            ->pluck('project_id')
            ->mapWithKeys(fn ($id) => [(int) $id => true])
            ->all();
    }
}
