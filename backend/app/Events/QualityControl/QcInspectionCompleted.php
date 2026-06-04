<?php

namespace App\Events\QualityControl;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QcInspectionCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $inspectionId,
        public string $context,
        public ?int $projectId,
        public string $result,
        public int $completedByUserId,
    ) {}
}
