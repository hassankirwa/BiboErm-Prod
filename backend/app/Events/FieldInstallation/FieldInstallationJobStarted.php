<?php

namespace App\Events\FieldInstallation;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FieldInstallationJobStarted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $jobId,
        public int $projectId,
        public int $startedByUserId,
    ) {}
}
