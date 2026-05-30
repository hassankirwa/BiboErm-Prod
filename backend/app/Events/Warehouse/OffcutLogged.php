<?php

namespace App\Events\Warehouse;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OffcutLogged
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $offcutPieceId,
        public int $warehouseItemId,
        public int $lengthMm,
        public int $binId,
        public ?int $sourceProjectId,
        public int $loggedByUserId,
    ) {}
}
