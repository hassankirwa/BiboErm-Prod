<?php

namespace App\Services\Warehouse\Movements;

use App\Enums\Warehouse\StockMovementType;
use App\Models\User;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\StockMovement;
use App\Models\Warehouse\StockMovementLine;
use App\Services\Warehouse\DocumentNumberGenerator;
use App\Services\Warehouse\Inventory\LowStockAlertService;
use App\Services\Warehouse\Inventory\StockLevelCalculator;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class StockMovementService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected StockLevelCalculator $stockLevels,
        protected WarehouseAuditLogger $audit,
        protected LowStockAlertService $lowStock,
    ) {}

    /**
     * @param  array<int, array{item_id: int, to_bin_id: int, quantity: string|float, unit_cost?: float|null}>  $lines
     */
    public function receive(
        User $performer,
        array $lines,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
    ): StockMovement {
        return $this->execute(
            type: StockMovementType::Inbound,
            performer: $performer,
            lines: array_map(fn (array $line) => [
                'item_id' => $line['item_id'],
                'from_bin_id' => null,
                'to_bin_id' => $line['to_bin_id'],
                'quantity' => (string) $line['quantity'],
                'unit_cost' => $line['unit_cost'] ?? null,
            ], $lines),
            referenceType: $referenceType,
            referenceId: $referenceId,
            notes: $notes,
        );
    }

    /**
     * Return surplus/extra project materials back into warehouse bins.
     *
     * @param  array<int, array{item_id: int, to_bin_id: int, quantity: string|float}>  $lines
     */
    public function returnStock(
        User $performer,
        array $lines,
        ?int $projectId = null,
        ?string $notes = null,
    ): StockMovement {
        return $this->execute(
            type: StockMovementType::Return,
            performer: $performer,
            lines: array_map(fn (array $line) => [
                'item_id' => $line['item_id'],
                'from_bin_id' => null,
                'to_bin_id' => $line['to_bin_id'],
                'quantity' => (string) $line['quantity'],
                'unit_cost' => null,
            ], $lines),
            referenceType: $projectId ? 'project' : null,
            referenceId: $projectId,
            notes: $notes,
        );
    }

    /**
     * @param  array<int, array{item_id: int, from_bin_id: int, to_bin_id: int, quantity: string|float}>  $lines
     */
    public function transfer(User $performer, array $lines, ?string $notes = null): StockMovement
    {
        return $this->execute(
            type: StockMovementType::Transfer,
            performer: $performer,
            lines: array_map(fn (array $line) => [
                'item_id' => $line['item_id'],
                'from_bin_id' => $line['from_bin_id'],
                'to_bin_id' => $line['to_bin_id'],
                'quantity' => (string) $line['quantity'],
                'unit_cost' => null,
            ], $lines),
            notes: $notes,
        );
    }

    /**
     * @param  array<int, array{item_id: int, bin_id: int, quantity: string|float, direction: 'increase'|'decrease'}>  $lines
     */
    public function adjust(
        User $performer,
        array $lines,
        ?string $notes = null,
        bool $respectAvailableOnDecrement = true,
    ): StockMovement {
        $mapped = [];

        foreach ($lines as $line) {
            $isIncrease = ($line['direction'] ?? 'increase') === 'increase';
            $mapped[] = [
                'item_id' => $line['item_id'],
                'from_bin_id' => $isIncrease ? null : $line['bin_id'],
                'to_bin_id' => $isIncrease ? $line['bin_id'] : null,
                'quantity' => (string) $line['quantity'],
                'unit_cost' => null,
            ];
        }

        return $this->execute(
            type: StockMovementType::Adjustment,
            performer: $performer,
            lines: $mapped,
            referenceType: 'stock_take',
            notes: $notes,
            respectAvailableOnDecrement: $respectAvailableOnDecrement,
        );
    }

    /**
     * @param  array<int, array{item_id: int, from_bin_id: int, quantity: string|float}>  $lines
     */
    public function issue(
        User $performer,
        array $lines,
        ?string $referenceType = 'project',
        ?int $referenceId = null,
        ?string $notes = null,
    ): StockMovement {
        return $this->execute(
            type: StockMovementType::Outbound,
            performer: $performer,
            lines: array_map(fn (array $line) => [
                'item_id' => $line['item_id'],
                'from_bin_id' => $line['from_bin_id'],
                'to_bin_id' => null,
                'quantity' => (string) $line['quantity'],
                'unit_cost' => null,
            ], $lines),
            referenceType: $referenceType,
            referenceId: $referenceId,
            notes: $notes,
        );
    }

    /**
     * @param  array<int, array{item_id: int, from_bin_id: int|null, to_bin_id: int|null, quantity: string, unit_cost: float|null}>  $lines
     */
    protected function execute(
        StockMovementType $type,
        User $performer,
        array $lines,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
        bool $respectAvailableOnDecrement = true,
    ): StockMovement {
        $this->assertPerformerCanAccessBins($performer, $lines);

        return DB::transaction(function () use ($type, $performer, $lines, $referenceType, $referenceId, $notes, $respectAvailableOnDecrement) {
            $movement = StockMovement::query()->create([
                'movement_number' => $this->numbers->next('SM', 'stock_movements', 'movement_number'),
                'movement_type' => $type,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'notes' => $notes,
                'performed_by' => $performer->id,
                'performed_at' => now(),
                'created_at' => now(),
            ]);

            foreach ($lines as $line) {
                StockMovementLine::query()->create([
                    'stock_movement_id' => $movement->id,
                    'item_id' => $line['item_id'],
                    'from_bin_id' => $line['from_bin_id'],
                    'to_bin_id' => $line['to_bin_id'],
                    'quantity' => $line['quantity'],
                    'unit_cost' => $line['unit_cost'],
                ]);

                if ($line['to_bin_id']) {
                    $this->stockLevels->incrementOnHand(
                        $line['item_id'],
                        $line['to_bin_id'],
                        $line['quantity']
                    );
                }

                if ($line['from_bin_id']) {
                    if ($respectAvailableOnDecrement) {
                        try {
                            $this->stockLevels->assertSufficientAvailable(
                                $line['item_id'],
                                $line['from_bin_id'],
                                $line['quantity']
                            );
                        } catch (\InvalidArgumentException $exception) {
                            throw ValidationException::withMessages([
                                'lines' => [$exception->getMessage()],
                            ]);
                        }
                    }

                    $this->stockLevels->decrementOnHand(
                        $line['item_id'],
                        $line['from_bin_id'],
                        $line['quantity']
                    );
                }
            }

            $movement = $movement->load('lines.item', 'lines.fromBin', 'lines.toBin', 'performer');

            match ($type) {
                StockMovementType::Inbound => $this->audit->stockReceived($movement->id, ['movement_number' => $movement->movement_number]),
                StockMovementType::Outbound => $this->audit->stockIssued($movement->id, ['movement_number' => $movement->movement_number]),
                StockMovementType::Transfer => $this->audit->stockTransferred($movement->id, ['movement_number' => $movement->movement_number]),
                StockMovementType::Adjustment => $this->audit->stockAdjusted($movement->id, ['movement_number' => $movement->movement_number]),
                StockMovementType::Return => $this->audit->stockReturned($movement->id, ['movement_number' => $movement->movement_number]),
            };

            foreach ($lines as $line) {
                $this->lowStock->scanAfterMovement($line['item_id']);
            }

            return $movement;
        });
    }

    /**
     * Record an outbound movement document without mutating stock levels.
     * Used when stock was already released via reservation services.
     *
     * @param  array<int, array{item_id: int, from_bin_id: int, quantity: string}>  $lines
     */
    public function recordOutboundDocument(
        User $performer,
        array $lines,
        ?string $referenceType = 'project',
        ?int $referenceId = null,
        ?string $notes = null,
    ): StockMovement {
        return DB::transaction(function () use ($performer, $lines, $referenceType, $referenceId, $notes) {
            $movement = StockMovement::query()->create([
                'movement_number' => $this->numbers->next('SM', 'stock_movements', 'movement_number'),
                'movement_type' => StockMovementType::Outbound,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'notes' => $notes,
                'performed_by' => $performer->id,
                'performed_at' => now(),
                'created_at' => now(),
            ]);

            foreach ($lines as $line) {
                StockMovementLine::query()->create([
                    'stock_movement_id' => $movement->id,
                    'item_id' => $line['item_id'],
                    'from_bin_id' => $line['from_bin_id'],
                    'to_bin_id' => null,
                    'quantity' => (string) $line['quantity'],
                    'unit_cost' => null,
                ]);
            }

            $movement = $movement->load('lines.item', 'lines.fromBin', 'performer');

            $this->audit->stockIssued($movement->id, [
                'movement_number' => $movement->movement_number,
                'project_id' => $referenceId,
                'via' => 'production_stage_release',
            ]);

            return $movement;
        });
    }

    /**
     * @param  array<int, array{item_id: int, from_bin_id: int|null, to_bin_id: int|null, quantity: string, unit_cost: float|null}>  $lines
     */
    protected function assertPerformerCanAccessBins(User $performer, array $lines): void
    {
        $binIds = [];

        foreach ($lines as $line) {
            if (! empty($line['from_bin_id'])) {
                $binIds[] = (int) $line['from_bin_id'];
            }

            if (! empty($line['to_bin_id'])) {
                $binIds[] = (int) $line['to_bin_id'];
            }
        }

        if ($binIds === []) {
            return;
        }

        $bins = Bin::query()
            ->whereIn('id', array_unique($binIds))
            ->with('section.deck')
            ->get()
            ->keyBy('id');

        foreach (array_unique($binIds) as $binId) {
            $bin = $bins->get($binId);

            if (! $bin instanceof Bin) {
                throw ValidationException::withMessages([
                    'lines' => ["Bin {$binId} was not found."],
                ]);
            }

            Gate::forUser($performer)->authorize('performOnBin', $bin);
        }
    }
}
