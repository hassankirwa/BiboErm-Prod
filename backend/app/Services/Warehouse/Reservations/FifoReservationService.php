<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\User;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\StockReservationLine;
use App\Services\Warehouse\DocumentNumberGenerator;
use App\Services\Warehouse\Inventory\StockLevelCalculator;
use App\Services\Warehouse\Offcuts\OffcutAllocationService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class FifoReservationService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected StockLevelCalculator $stockLevels,
        protected BomStockCheckService $bomStockCheck,
        protected OffcutAllocationService $offcutAllocation,
        protected FifoSequenceResolver $fifoSequence,
        protected AluminiumBarDemandService $aluminiumDemand,
    ) {}

    /**
     * @param  array<int, array{item_id: int, quantity: string|float, bom_line_ref?: string|null, required_length_mm?: int|null, project_bom_line_id?: int|null}>  $bomLines
     * @return array{success: bool, reservation?: StockReservation, check: array<string, mixed>}
     */
    public function reserveForProject(User $user, int $projectId, array $bomLines, ?string $notes = null): array
    {
        $check = $this->bomStockCheck->check($projectId, $bomLines);

        if (! $check['can_fully_reserve']) {
            return ['success' => false, 'check' => $check];
        }

        try {
            $reservation = DB::transaction(function () use ($user, $projectId, $bomLines, $notes, $check) {
                $allocations = [];
                $aluminiumPlans = $check['aluminium_plans'] ?? [];
                $aluminiumReserved = [];

                $items = Item::query()
                    ->whereIn('id', array_unique(array_map(fn ($l) => (int) $l['item_id'], $bomLines)))
                    ->with('aluminiumProfile')
                    ->get()
                    ->keyBy('id');

                foreach ($bomLines as $bomLine) {
                    $item = $items->get((int) $bomLine['item_id']);
                    if (! $item) {
                        throw new InvalidArgumentException('Unknown warehouse item on BOM line.');
                    }

                    if ($item->category === ItemCategory::AluminiumProfile) {
                        if (isset($aluminiumReserved[$item->id])) {
                            continue;
                        }
                        $aluminiumReserved[$item->id] = true;

                        $plan = $aluminiumPlans[$item->id]
                            ?? $this->aluminiumDemand->planForItem($item, array_values(array_filter(
                                $bomLines,
                                fn ($l) => (int) $l['item_id'] === $item->id
                            )));

                        if (($plan['offcut_piece_ids'] ?? []) !== []) {
                            $this->offcutAllocation->allocatePieceIds($projectId, $plan['offcut_piece_ids']);
                        }

                        $remaining = (string) ($plan['reserve_qty'] ?? '0');
                        if (bccomp($remaining, '0', 3) !== 1) {
                            continue;
                        }

                        $this->allocateFromBins(
                            $item,
                            $remaining,
                            $bomLine['bom_line_ref'] ?? null,
                            $allocations,
                        );

                        continue;
                    }

                    $remaining = (string) $bomLine['quantity'];
                    if (bccomp($remaining, '0', 3) !== 1) {
                        continue;
                    }

                    $this->allocateFromBins(
                        $item,
                        $remaining,
                        $bomLine['bom_line_ref'] ?? null,
                        $allocations,
                    );
                }

                $reservation = StockReservation::query()->create([
                    'reservation_number' => $this->numbers->next('RSV', 'stock_reservations', 'reservation_number'),
                    'project_id' => $projectId,
                    'status' => ReservationStatus::Pending,
                    'reserved_at' => now(),
                    'reserved_by' => $user->id,
                    'fifo_sequence' => $this->fifoSequence->sequenceForProject($projectId),
                    'notes' => $notes,
                ]);

                foreach ($allocations as $allocation) {
                    StockReservationLine::query()->create([
                        'reservation_id' => $reservation->id,
                        'item_id' => $allocation['item_id'],
                        'bin_id' => $allocation['bin_id'],
                        'quantity_reserved' => $allocation['quantity'],
                        'quantity_released' => 0,
                        'bom_line_ref' => $allocation['bom_line_ref'],
                    ]);
                }

                return $reservation->load('lines.item', 'lines.bin', 'project', 'reservedByUser');
            });
        } catch (InvalidArgumentException) {
            return [
                'success' => false,
                'check' => $this->bomStockCheck->check($projectId, $bomLines),
            ];
        }

        return [
            'success' => true,
            'reservation' => $reservation,
            'check' => $check,
        ];
    }

    /**
     * @param  array<int, array{item_id: int, bin_id: int, quantity: string, bom_line_ref: string|null}>  $allocations
     */
    protected function allocateFromBins(
        Item $item,
        string $remaining,
        ?string $bomLineRef,
        array &$allocations,
    ): void {
        $preferredBinId = $this->bomStockCheck->preferredBinIdForItem($item);
        $bins = $this->stockLevels->binsWithAvailableStock($item->id, $preferredBinId);

        foreach ($bins as $level) {
            if (bccomp($remaining, '0', 3) !== 1) {
                break;
            }

            $available = $level->availableQuantity();
            $take = bccomp($available, $remaining, 3) >= 0 ? $remaining : $available;

            if (bccomp($take, '0', 3) !== 1) {
                continue;
            }

            $this->stockLevels->incrementReserved($item->id, $level->bin_id, $take);

            $allocations[] = [
                'item_id' => $item->id,
                'bin_id' => $level->bin_id,
                'quantity' => $take,
                'bom_line_ref' => $bomLineRef,
            ];

            $remaining = bcsub($remaining, $take, 3);
        }

        if (bccomp($remaining, '0', 3) === 1) {
            throw new InvalidArgumentException("Unable to fully reserve item {$item->sku}.");
        }
    }

    public function release(StockReservation $reservation, ?string $quantity = null, ?array $itemIds = null): StockReservation
    {
        return DB::transaction(function () use ($reservation, $quantity, $itemIds) {
            $reservation->load('lines');

            foreach ($reservation->lines as $line) {
                if ($itemIds && ! in_array($line->item_id, $itemIds, true)) {
                    continue;
                }

                $toRelease = $quantity ?? $line->remainingQuantity();

                if (bccomp($toRelease, '0', 3) !== 1) {
                    continue;
                }

                if (bccomp($toRelease, $line->remainingQuantity(), 3) === 1) {
                    throw new InvalidArgumentException('Release quantity exceeds reserved amount.');
                }

                $level = $this->stockLevels->getOrCreateLevel($line->item_id, $line->bin_id);
                $reservedOnHand = (string) $level->quantity_reserved;

                if (bccomp($reservedOnHand, $toRelease, 3) < 0) {
                    $toRelease = $reservedOnHand;
                }

                if (bccomp($toRelease, '0', 3) !== 1) {
                    continue;
                }

                $this->stockLevels->decrementReserved($line->item_id, $line->bin_id, $toRelease);
                $this->stockLevels->decrementOnHand($line->item_id, $line->bin_id, $toRelease);

                $line->quantity_released = bcadd((string) $line->quantity_released, $toRelease, 3);
                $line->save();
            }

            $allReleased = $reservation->lines->every(
                fn (StockReservationLine $line) => bccomp($line->remainingQuantity(), '0', 3) !== 1
            );

            $reservation->status = $allReleased ? ReservationStatus::Released : ReservationStatus::Partial;
            $reservation->save();

            return $reservation->fresh(['lines.item', 'lines.bin', 'project']);
        });
    }
}
