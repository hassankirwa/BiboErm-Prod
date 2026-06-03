<?php

namespace App\Events\Warehouse;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectMaterialsReserved
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $projectId,
        public int $reservationId,
        public int $fifoSequence,
    ) {}
}
