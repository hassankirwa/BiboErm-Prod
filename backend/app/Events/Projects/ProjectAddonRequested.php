<?php

namespace App\Events\Projects;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectAddonRequested
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $projectId,
        public int $requestedByUserId,
        public string $description,
        public bool $clientRequested = true,
    ) {}
}
