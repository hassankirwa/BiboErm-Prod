<?php

namespace App\Events\Warehouse;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectMaterialShortageDetected
{
    use Dispatchable, SerializesModels;

    /**
     * @param  array<int, array{project_bom_line_id?: int|null, warehouse_item_id: int, qty_required: string, qty_available: string, qty_short: string}>  $shortageLines
     */
    public function __construct(
        public int $projectId,
        public ?int $reservationId,
        public array $shortageLines,
    ) {}
}
