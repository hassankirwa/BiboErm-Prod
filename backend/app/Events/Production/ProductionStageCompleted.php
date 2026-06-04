<?php

namespace App\Events\Production;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProductionStageCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $projectId,
        public int $productionOrderId,
        public string $productionStage,
        public ?int $completedByUserId = null,
    ) {}
}
