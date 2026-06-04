<?php

namespace App\Events\FieldInstallation;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FieldInstallationDailyLogSubmitted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $jobId,
        public int $projectId,
        public int $dailyLogId,
        public int $submittedByUserId,
    ) {}
}
