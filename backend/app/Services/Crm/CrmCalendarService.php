<?php

namespace App\Services\Crm;

use App\Models\User;
use App\Services\Workspace\WorkspaceCalendarService;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CrmCalendarService
{
    public function __construct(
        protected WorkspaceCalendarService $workspaceCalendar,
    ) {}

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function eventsForRange(
        Carbon $from,
        Carbon $to,
        User $user,
        ?int $assignedTo = null,
        ?int $accountId = null,
        ?int $leadId = null,
    ): Collection {
        return $this->workspaceCalendar->eventsForRange(
            $from,
            $to,
            $user,
            $assignedTo,
            $accountId,
            $leadId,
            null,
            null,
            null,
        )->filter(fn (array $event) => in_array($event['source'], ['crm_activity', 'site_visit'], true))->values();
    }
}
