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
     * Reserve BOM demand for a project. Tops up an existing pending/partial reservation
     * when stock is already partially held — only the remaining gap is allocated.
     *
     * @param  array<int, array{item_id: int, quantity: string|float, bom_line_ref?: string|null, required_length_mm?: int|null, project_bom_line_id?: int|null}>  $bomLines
     * @return array{success: bool, reservation?: StockReservation, check: array<string, mixed>, topped_up?: bool}
     */
    public function reserveForProject(User $user, int $projectId, array $bomLines, ?string $notes = null): array
    {
        $check = $this->bomStockCheck->check($projectId, $bomLines);

        if (! $check['can_fully_reserve']) {
            return ['success' => false, 'check' => $check];
        }

        try {
            $result = DB::transaction(function () use ($user, $projectId, $bomLines, $notes, $check) {
                $allocations = [];
                $aluminiumPlans = $check['aluminium_plans'] ?? [];
                $aluminiumReserved = [];
                $held = $this->bomStockCheck->remainingHeldForProject($projectId);

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

                    if ($this->aluminiumDemand->shouldCombineCuts($item, array_values(array_filter(
                        $bomLines,
                        fn ($l) => (int) $l['item_id'] === $item->id
                    )))) {
                        if (isset($aluminiumReserved[$item->id])) {
                            continue;
                        }
                        $aluminiumReserved[$item->id] = true;

                        $plan = $aluminiumPlans[$item->id]
                            ?? ($this->aluminiumDemand->shouldPackOntoBars($item)
                                ? $this->aluminiumDemand->planForItem($item, array_values(array_filter(
                                    $bomLines,
                                    fn ($l) => (int) $l['item_id'] === $item->id
                                )))
                                : $this->aluminiumDemand->exactMetrePlanForItem($item, array_values(array_filter(
                                    $bomLines,
                                    fn ($l) => (int) $l['item_id'] === $item->id
                                ))));

                        $target = (string) ($plan['reserve_qty'] ?? '0');
                        $alreadyHeld = $held['by_item'][$item->id] ?? '0.000';
                        $remaining = bccomp($target, $alreadyHeld, 3) === 1
                            ? bcsub($target, $alreadyHeld, 3)
                            : '0.000';

                        if (bccomp($remaining, '0', 3) !== 1) {
                            continue;
                        }

                        // Offcuts only for aluminium bar packing on first full reserve.
                        if (
                            $this->aluminiumDemand->shouldPackOntoBars($item)
                            && bccomp($alreadyHeld, '0', 3) !== 1
                            && ($plan['offcut_piece_ids'] ?? []) !== []
                        ) {
                            $this->offcutAllocation->allocatePieceIds($projectId, $plan['offcut_piece_ids']);
                        }

                        $this->allocateFromBins(
                            $item,
                            $remaining,
                            $bomLine['bom_line_ref'] ?? null,
                            $allocations,
                        );

                        continue;
                    }

                    $bomRef = isset($bomLine['bom_line_ref']) ? (string) $bomLine['bom_line_ref'] : null;
                    $target = (string) $bomLine['quantity'];
                    $alreadyHeld = $bomRef !== null && $bomRef !== ''
                        ? ($held['by_ref'][$bomRef] ?? '0.000')
                        : ($held['by_item'][$item->id] ?? '0.000');
                    $remaining = bccomp($target, $alreadyHeld, 3) === 1
                        ? bcsub($target, $alreadyHeld, 3)
                        : '0.000';

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

                $existing = $this->activeReservationForProject($projectId);
                $toppedUp = $existing !== null;

                if ($allocations === []) {
                    if ($existing === null) {
                        throw new InvalidArgumentException('Nothing to reserve.');
                    }

                    return [
                        'reservation' => $existing->load('lines.item', 'lines.bin', 'project', 'reservedByUser'),
                        'topped_up' => true,
                    ];
                }

                if ($existing !== null) {
                    $reservation = $existing;
                    if ($notes) {
                        $reservation->notes = trim(($reservation->notes ? $reservation->notes."\n" : '').$notes);
                        $reservation->save();
                    }
                    if ($reservation->status === ReservationStatus::Partial) {
                        $reservation->status = ReservationStatus::Pending;
                        $reservation->save();
                    }
                } else {
                    $reservation = StockReservation::query()->create([
                        'reservation_number' => $this->numbers->next('RSV', 'stock_reservations', 'reservation_number'),
                        'project_id' => $projectId,
                        'status' => ReservationStatus::Pending,
                        'reserved_at' => now(),
                        'reserved_by' => $user->id,
                        'fifo_sequence' => $this->fifoSequence->sequenceForProject($projectId),
                        'notes' => $notes,
                    ]);
                }

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

                return [
                    'reservation' => $reservation->load('lines.item', 'lines.bin', 'project', 'reservedByUser'),
                    'topped_up' => $toppedUp,
                ];
            });
        } catch (InvalidArgumentException) {
            return [
                'success' => false,
                'check' => $this->bomStockCheck->check($projectId, $bomLines),
            ];
        }

        return [
            'success' => true,
            'reservation' => $result['reservation'],
            'check' => $check,
            'topped_up' => (bool) ($result['topped_up'] ?? false),
        ];
    }

    /**
     * Manually set how much of an item remains held for a project (absolute quantity).
     * Increases allocate from bins; decreases free the hold without consuming on-hand.
     *
     * @return array{success: bool, reservation: StockReservation, previous_qty: string, quantity_reserved: string}
     */
    public function adjustHeldQuantity(
        User $user,
        int $projectId,
        int $itemId,
        string $targetQuantity,
        ?string $notes = null,
        ?string $bomLineRef = null,
    ): array {
        $targetQuantity = number_format((float) $targetQuantity, 3, '.', '');

        if (bccomp($targetQuantity, '0', 3) < 0) {
            throw new InvalidArgumentException('Reserved quantity cannot be negative.');
        }

        $item = Item::query()->with('aluminiumProfile')->find($itemId);
        if (! $item) {
            throw new InvalidArgumentException('Unknown warehouse item.');
        }

        return DB::transaction(function () use ($user, $projectId, $item, $targetQuantity, $notes, $bomLineRef) {
            $held = $this->bomStockCheck->remainingHeldForProject($projectId);
            $current = $bomLineRef !== null && $bomLineRef !== ''
                ? ($held['by_ref'][$bomLineRef] ?? '0.000')
                : ($held['by_item'][$item->id] ?? '0.000');

            // Item-level held qty when adjusting a bar-packed SKU row (no BOM ref) or aluminium/rubber rolls.
            if (
                $bomLineRef === null
                || $bomLineRef === ''
                || $item->category === ItemCategory::AluminiumProfile
                || ($item->category === ItemCategory::Rubber && $this->aluminiumDemand->isMetreUom($item))
            ) {
                $current = $held['by_item'][$item->id] ?? '0.000';
            }

            $delta = bcsub($targetQuantity, $current, 3);
            $reservation = $this->activeReservationForProject($projectId);

            if (bccomp($delta, '0', 3) === 0) {
                if ($reservation === null) {
                    throw new InvalidArgumentException('No active reservation to adjust.');
                }

                return [
                    'success' => true,
                    'reservation' => $reservation->load('lines.item', 'lines.bin', 'project', 'reservedByUser'),
                    'previous_qty' => $current,
                    'quantity_reserved' => $current,
                ];
            }

            if ($reservation === null) {
                if (bccomp($delta, '0', 3) < 0) {
                    throw new InvalidArgumentException('No active reservation to reduce.');
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
            } elseif ($notes) {
                $reservation->notes = trim(($reservation->notes ? $reservation->notes."\n" : '').$notes);
                $reservation->save();
            }

            if (bccomp($delta, '0', 3) === 1) {
                $allocations = [];
                $this->allocateFromBins($item, $delta, $bomLineRef, $allocations);

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

                if ($reservation->status === ReservationStatus::Partial) {
                    $reservation->status = ReservationStatus::Pending;
                    $reservation->save();
                }
            } else {
                $this->reduceHold($reservation, $item->id, bcmul($delta, '-1', 3), $bomLineRef);
            }

            return [
                'success' => true,
                'reservation' => $reservation->fresh(['lines.item', 'lines.bin', 'project', 'reservedByUser']),
                'previous_qty' => $current,
                'quantity_reserved' => $targetQuantity,
            ];
        });
    }

    /**
     * Free held stock without consuming on-hand (manual un-reserve / down-adjust).
     */
    protected function reduceHold(
        StockReservation $reservation,
        int $itemId,
        string $quantity,
        ?string $bomLineRef = null,
    ): void {
        $remaining = $quantity;
        $reservation->load('lines');

        $lines = $reservation->lines
            ->filter(function (StockReservationLine $line) use ($itemId, $bomLineRef) {
                if ((int) $line->item_id !== $itemId) {
                    return false;
                }
                if ($bomLineRef !== null && $bomLineRef !== '' && (string) $line->bom_line_ref !== $bomLineRef) {
                    return false;
                }

                return bccomp($line->remainingQuantity(), '0', 3) === 1;
            })
            ->sortByDesc(fn (StockReservationLine $line) => $line->id)
            ->values();

        foreach ($lines as $line) {
            if (bccomp($remaining, '0', 3) !== 1) {
                break;
            }

            $lineRemaining = $line->remainingQuantity();
            $take = bccomp($lineRemaining, $remaining, 3) >= 0 ? $remaining : $lineRemaining;

            $this->stockLevels->decrementReserved($line->item_id, $line->bin_id, $take);
            $line->quantity_reserved = bcsub((string) $line->quantity_reserved, $take, 3);
            $line->save();

            $remaining = bcsub($remaining, $take, 3);
        }

        if (bccomp($remaining, '0', 3) === 1) {
            throw new InvalidArgumentException('Cannot reduce reserved quantity below zero.');
        }
    }

    protected function activeReservationForProject(int $projectId): ?StockReservation
    {
        return StockReservation::query()
            ->where('project_id', $projectId)
            ->whereIn('status', [
                ReservationStatus::Pending,
                ReservationStatus::Partial,
            ])
            ->orderByDesc('id')
            ->first();
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

    /**
     * Release reserved stock (full remaining, filtered items, or per-item quantities).
     *
     * @param  list<int>|null  $itemIds  When set without $quantitiesByItemId, release remaining for these items.
     * @param  array<int, string|float|int>|null  $quantitiesByItemId  item_id => qty to release now (spread across bins).
     */
    public function release(
        StockReservation $reservation,
        ?string $quantity = null,
        ?array $itemIds = null,
        ?array $quantitiesByItemId = null,
    ): StockReservation {
        return DB::transaction(function () use ($reservation, $quantity, $itemIds, $quantitiesByItemId) {
            $reservation->load('lines');

            /** @var array<int, string> $remainingByItem */
            $remainingByItem = [];
            if ($quantitiesByItemId !== null) {
                foreach ($quantitiesByItemId as $itemId => $qty) {
                    $remainingByItem[(int) $itemId] = bcadd((string) $qty, '0', 3);
                }
            }

            $filterIds = $itemIds;
            if ($quantitiesByItemId !== null) {
                $filterIds = array_keys($remainingByItem);
            }

            foreach ($reservation->lines as $line) {
                $itemId = (int) $line->item_id;

                if ($filterIds !== null && ! in_array($itemId, $filterIds, true)) {
                    continue;
                }

                if ($quantitiesByItemId !== null) {
                    $budget = $remainingByItem[$itemId] ?? '0';
                    if (bccomp($budget, '0', 3) !== 1) {
                        continue;
                    }
                    $lineRemaining = $line->remainingQuantity();
                    $toRelease = bccomp($budget, $lineRemaining, 3) === 1 ? $lineRemaining : $budget;
                    $remainingByItem[$itemId] = bcsub($budget, $toRelease, 3);
                } else {
                    $toRelease = $quantity ?? $line->remainingQuantity();
                }

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

            if ($quantitiesByItemId !== null) {
                foreach ($remainingByItem as $itemId => $left) {
                    if (bccomp($left, '0', 3) === 1) {
                        throw new InvalidArgumentException(
                            "Unable to release full requested quantity for item #{$itemId} (short {$left})."
                        );
                    }
                }
            }

            $reservation->refresh()->load('lines');

            $allReleased = $reservation->lines->every(
                fn (StockReservationLine $line) => bccomp($line->remainingQuantity(), '0', 3) !== 1
            );

            $anyReleased = $reservation->lines->contains(
                fn (StockReservationLine $line) => bccomp((string) $line->quantity_released, '0', 3) === 1
            );

            $reservation->status = $allReleased
                ? ReservationStatus::Released
                : ($anyReleased ? ReservationStatus::Partial : $reservation->status);
            $reservation->save();

            return $reservation->fresh(['lines.item', 'lines.bin', 'project']);
        });
    }
}
