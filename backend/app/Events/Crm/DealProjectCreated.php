<?php

namespace App\Events\Crm;

use App\Models\Deal;
use App\Models\Project;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DealProjectCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Deal $deal,
        public Project $project,
    ) {}
}
