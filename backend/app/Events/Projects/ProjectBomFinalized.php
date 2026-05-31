<?php

namespace App\Events\Projects;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectBomFinalized
{
    use Dispatchable, SerializesModels;

    /**
     * @param  array<int, array{warehouse_item_id: int, qty_required: string|float, project_bom_line_id?: int|null, required_length_mm?: int|null, bom_line_ref?: string|null}>  $lineSummary
     */
    public function __construct(
        public int $projectId,
        public int $bomId,
        public int $version,
        public int $finalizedByUserId,
        public array $lineSummary = [],
    ) {}
}
