<?php

namespace App\Services\Warehouse\Movements;

use App\Enums\Warehouse\ReservationStatus;
use App\Enums\Warehouse\StockMovementType;
use App\Models\User;
use App\Models\Warehouse\StockMovement;
use App\Models\Warehouse\StockMovementLine;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\StockReservationLine;
use App\Services\Warehouse\DocumentNumberGenerator;
use App\Services\Warehouse\Inventory\LowStockAlertService;
use App\Services\Warehouse\Inventory\StockLevelCalculator;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class IssueStockService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected StockLevelCalculator $stockLevels,
        protected WarehouseAuditLogger $audit,
        protected LowStockAlertService $lowStock,
    ) {}

    /**
     * Issue stock to a project, releasing matching reservation quantities first.
     *
     * @param  array<int, array{item_id: int, from_bin_id: int, quantity: string|float}>  $lines
     */
    public function issueToProject(
        User $performer,
        int $projectId,
        array $lines,
        ?string $notes = null,
    ): StockMovement {
        $this->assertPerformerCanAccessBins($performer, $lines);

        return DB::transaction(function () use ($performer, $projectId, $lines, $notes) {
            $reservation = StockReservation::query()
                ->where('project_id', $projectId)
                ->whereIn('status', [ReservationStatus::Pending, ReservationStatus::Partial])
                ->latest('id')
                ->first();

            $releasedAny = false;

            $movement = StockMovement::query()->create([
                'movement_number' => $this->numbers->next('SM', 'stock_movements', 'movement_number'),
                'movement_type' => StockMovementType::Outbound,
                'reference_type' => 'project',
                'reference_id' => $projectId,
                'notes' => $notes,
                'performed_by' => $performer->id,
                'performed_at' => now(),
                'created_at' => now(),
            ]);

            foreach ($lines as $line) {
                $itemId = (int) $line['item_id'];
                $binId = (int) $line['from_bin_id'];
                $remaining = (string) $line['quantity'];

                StockMovementLine::query()->create([
                    'stock_movement_id' => $movement->id,
                    'item_id' => $itemId,
                    'from_bin_id' => $binId,
                    'to_bin_id' => null,
                    'quantity' => $remaining,
                    'unit_cost' => null,
                ]);

                if ($reservation) {
                    $released = $this->releaseFromReservationLine(
                        reservation: $reservation,
                        itemId: $itemId,
                        binId: $binId,
                        quantity: $remaining,
                    );
                    if (bccomp($released, '0', 3) === 1) {
                        $releasedAny = true;
                    }
                    $remaining = bcsub($remaining, $released, 3);
                }

                if (bccomp($remaining, '0', 3) === 1) {
                    try {
                        $this->stockLevels->assertSufficientAvailable($itemId, $binId, $remaining);
                    } catch (\InvalidArgumentException $exception) {
                        throw ValidationException::withMessages([
                            'lines' => [$exception->getMessage()],
                        ]);
                    }

                    $this->stockLevels->decrementOnHand($itemId, $binId, $remaining);
                }

                $this->lowStock->scanAfterMovement($itemId);
            }

            if ($reservation && $releasedAny) {
                $this->refreshReservationStatus($reservation);
                $this->audit->reservationReleased($reservation->id, [
                    'project_id' => $projectId,
                    'movement_id' => $movement->id,
                    'via' => 'issue',
                ]);
            }

            $movement = $movement->load('lines.item', 'lines.fromBin', 'performer');
            $this->audit->stockIssued($movement->id, [
                'movement_number' => $movement->movement_number,
                'project_id' => $projectId,
            ]);

            return $movement;
        });
    }

    /**
     * Issue stock without project reservation coupling.
     *
     * @param  array<int, array{item_id: int, from_bin_id: int, quantity: string|float}>  $lines
     */
    public function issue(User $performer, array $lines, ?string $notes = null): StockMovement
    {
        return app(StockMovementService::class)->issue(
            performer: $performer,
            lines: $lines,
            referenceType: null,
            referenceId: null,
            notes: $notes,
        );
    }

    protected function releaseFromReservationLine(
        StockReservation $reservation,
        int $itemId,
        int $binId,
        string $quantity,
    ): string {
        $line = StockReservationLine::query()
            ->where('reservation_id', $reservation->id)
            ->where('item_id', $itemId)
            ->where('bin_id', $binId)
            ->first();

        if (! $line) {
            return '0.000';
        }

        $availableToRelease = $line->remainingQuantity();
        $toRelease = bccomp($availableToRelease, $quantity, 3) >= 0 ? $quantity : $availableToRelease;

        if (bccomp($toRelease, '0', 3) !== 1) {
            return '0.000';
        }

        $this->stockLevels->decrementReserved($itemId, $binId, $toRelease);
        $this->stockLevels->decrementOnHand($itemId, $binId, $toRelease);

        $line->quantity_released = bcadd((string) $line->quantity_released, $toRelease, 3);
        $line->save();

        return $toRelease;
    }

    protected function refreshReservationStatus(StockReservation $reservation): void
    {
        $reservation->load('lines');

        $allReleased = $reservation->lines->every(
            fn (StockReservationLine $line) => bccomp($line->remainingQuantity(), '0', 3) !== 1
        );

        $reservation->status = $allReleased ? ReservationStatus::Released : ReservationStatus::Partial;
        $reservation->save();
    }

    /**
     * @param  array<int, array{item_id: int, from_bin_id: int, quantity: string|float}>  $lines
     */
    protected function assertPerformerCanAccessBins(User $performer, array $lines): void
    {
        foreach ($lines as $line) {
            $bin = \App\Models\Warehouse\Bin::query()
                ->with('section.deck')
                ->findOrFail($line['from_bin_id']);

            Gate::forUser($performer)->authorize('performOnBin', $bin);
        }
    }
}
