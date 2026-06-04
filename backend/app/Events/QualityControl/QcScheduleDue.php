<?php

namespace App\Events\QualityControl;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QcScheduleDue
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $scheduleId,
        public string $context,
        public string $dueAt,
    ) {}
}
