<?php

namespace App\Services\Warehouse\Offcuts;

use App\Enums\Warehouse\ReferenceType;
use App\Events\Warehouse\OffcutLogged;
use App\Models\User;
use App\Models\Warehouse\OffcutPiece;
use App\Services\Warehouse\DocumentNumberGenerator;
use App\Services\Warehouse\Movements\StockMovementService;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Support\Facades\DB;

class OffcutLoggingService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected StockMovementService $movements,
        protected WarehouseAuditLogger $audit,
    ) {}

    public function log(
        User $user,
        int $itemId,
        int $binId,
        int $lengthMm,
        int $quantityPieces = 1,
        ?int $sourceProjectId = null,
        ?string $notes = null,
    ): OffcutPiece {
        return DB::transaction(function () use ($user, $itemId, $binId, $lengthMm, $quantityPieces, $sourceProjectId, $notes) {
            $movement = $this->movements->receive(
                performer: $user,
                lines: [[
                    'item_id' => $itemId,
                    'to_bin_id' => $binId,
                    'quantity' => bcdiv((string) ($lengthMm * $quantityPieces), '1000', 3),
                ]],
                referenceType: ReferenceType::Offcut->value,
                notes: $notes,
            );

            $offcut = OffcutPiece::query()->create([
                'offcut_number' => $this->numbers->next('OFF', 'offcut_pieces', 'offcut_number'),
                'item_id' => $itemId,
                'bin_id' => $binId,
                'length_mm' => $lengthMm,
                'quantity_pieces' => $quantityPieces,
                'source_project_id' => $sourceProjectId,
                'source_movement_id' => $movement->id,
                'status' => \App\Enums\Warehouse\OffcutStatus::Available,
                'logged_by' => $user->id,
                'logged_at' => now(),
                'notes' => $notes,
                'created_at' => now(),
            ])->load('item', 'bin', 'loggedByUser');

            $this->audit->offcutLogged($offcut->id, [
                'item_id' => $itemId,
                'length_mm' => $lengthMm,
                'source_project_id' => $sourceProjectId,
            ]);

            event(new OffcutLogged(
                offcutPieceId: $offcut->id,
                warehouseItemId: $itemId,
                lengthMm: $lengthMm,
                binId: $binId,
                sourceProjectId: $sourceProjectId,
                loggedByUserId: $user->id,
            ));

            return $offcut;
        });
    }
}
