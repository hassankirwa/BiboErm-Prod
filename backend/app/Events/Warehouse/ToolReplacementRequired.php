<?php

namespace App\Events\Warehouse;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ToolReplacementRequired
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $toolId,
        public string $toolCode,
        public int $issuanceId,
        public string $conditionIn,
        public ?string $damageNotes = null,
    ) {}
}
