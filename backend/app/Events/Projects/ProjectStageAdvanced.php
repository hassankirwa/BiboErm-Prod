<?php

namespace App\Events\Projects;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectStageAdvanced
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $projectId,
        public string $fromStage,
        public string $toStage,
        public ?int $changedByUserId = null,
    ) {}
}
