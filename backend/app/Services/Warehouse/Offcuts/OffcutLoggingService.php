<?php

namespace App\Services\Warehouse\Offcuts;

use App\Enums\Warehouse\OffcutStatus;
use App\Enums\Warehouse\OffcutStorageArea;
use App\Enums\Warehouse\ReferenceType;
use App\Events\Warehouse\OffcutLogged;
use App\Models\User;
use App\Models\Warehouse\OffcutPiece;
use App\Services\Warehouse\DocumentNumberGenerator;
use App\Services\Warehouse\Movements\StockMovementService;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OffcutLoggingService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected StockMovementService $movements,
        protected WarehouseAuditLogger $audit,
    ) {}

    public function log(User $user, OffcutLogPayload $payload): OffcutPiece
    {
        if ($payload->requiresBin() && ! $payload->binId) {
            throw ValidationException::withMessages([
                'bin_id' => ['A warehouse bin is required for deck offcuts.'],
            ]);
        }

        return DB::transaction(function () use ($user, $payload) {
            $movementId = null;

            if ($payload->binId) {
                $movement = $this->movements->receive(
                    performer: $user,
                    lines: [[
                        'item_id' => $payload->itemId,
                        'to_bin_id' => $payload->binId,
                        'quantity' => bcdiv((string) ($payload->lengthMm * $payload->quantityPieces), '1000', 3),
                    ]],
                    referenceType: ReferenceType::Offcut->value,
                    notes: $payload->notes,
                );
                $movementId = $movement->id;
            }

            $offcut = OffcutPiece::query()->create([
                'offcut_number' => $this->numbers->next('OFF', 'offcut_pieces', 'offcut_number'),
                'item_id' => $payload->itemId,
                'bin_id' => $payload->binId,
                'storage_area' => $payload->storageArea->value,
                'length_mm' => $payload->lengthMm,
                'quantity_pieces' => $payload->quantityPieces,
                'source_project_id' => $payload->sourceProjectId,
                'source_movement_id' => $movementId,
                'status' => OffcutStatus::Available,
                'logged_by' => $user->id,
                'logged_at' => now(),
                'notes' => $payload->notes,
                'created_at' => now(),
            ])->load('item', 'bin', 'loggedByUser');

            $this->audit->offcutLogged($offcut->id, [
                'item_id' => $payload->itemId,
                'length_mm' => $payload->lengthMm,
                'source_project_id' => $payload->sourceProjectId,
                'storage_area' => $payload->storageArea->value,
            ]);

            event(new OffcutLogged(
                offcutPieceId: $offcut->id,
                warehouseItemId: $payload->itemId,
                lengthMm: $payload->lengthMm,
                binId: $payload->binId,
                sourceProjectId: $payload->sourceProjectId,
                loggedByUserId: $user->id,
            ));

            return $offcut;
        });
    }

    /**
     * @param  array{item_id: int, length_mm: int, quantity_pieces?: int, bin_id?: int|null, storage_area?: string|null, notes?: string|null}  $data
     */
    public function logFromArray(User $user, array $data, ?int $sourceProjectId = null): OffcutPiece
    {
        $storageArea = isset($data['storage_area'])
            ? OffcutStorageArea::from($data['storage_area'])
            : ($sourceProjectId !== null
                ? OffcutStorageArea::ProductionWorkspace
                : OffcutStorageArea::WarehouseDeck);

        return $this->log($user, new OffcutLogPayload(
            itemId: (int) $data['item_id'],
            lengthMm: (int) $data['length_mm'],
            quantityPieces: (int) ($data['quantity_pieces'] ?? 1),
            binId: isset($data['bin_id']) ? (int) $data['bin_id'] : null,
            storageArea: $storageArea,
            sourceProjectId: $sourceProjectId,
            notes: $data['notes'] ?? null,
        ));
    }
}
