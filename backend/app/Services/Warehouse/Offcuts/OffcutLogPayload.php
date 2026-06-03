<?php

namespace App\Services\Warehouse\Offcuts;

use App\Enums\Warehouse\OffcutStorageArea;

readonly class OffcutLogPayload
{
    public function __construct(
        public int $itemId,
        public int $lengthMm,
        public int $quantityPieces = 1,
        public ?int $binId = null,
        public OffcutStorageArea $storageArea = OffcutStorageArea::WarehouseDeck,
        public ?int $sourceProjectId = null,
        public ?string $notes = null,
    ) {}

    public function requiresBin(): bool
    {
        return $this->storageArea === OffcutStorageArea::WarehouseDeck;
    }
}
