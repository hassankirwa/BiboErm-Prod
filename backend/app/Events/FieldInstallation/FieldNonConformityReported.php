<?php

namespace App\Events\FieldInstallation;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FieldNonConformityReported
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $jobId,
        public int $projectId,
        public int $nonConformityId,
        public string $severity,
        public int $reportedByUserId,
    ) {}
}
