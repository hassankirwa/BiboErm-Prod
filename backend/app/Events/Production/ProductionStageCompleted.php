<?php

namespace App\Events\Production;

use App\Enums\Production\ProductionStage;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class ProductionStageCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $productionOrderId,
        public int $projectId,
        public ProductionStage $stage,
        public int $completedByUserId,
        public Carbon $completedAt,
    ) {}
}
