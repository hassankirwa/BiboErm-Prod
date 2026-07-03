<?php

namespace App\Services\Notifications;

use App\Models\DesignJob;
use App\Models\SiteVisit;
use App\Models\User;
use App\Notifications\Assignments\DesignJobAssignedNotification;
use App\Notifications\Assignments\SiteVisitAssignedNotification;

class AssignmentNotificationService
{
    public function notifyDesignJobAssigned(DesignJob $job, User $assignee, User $assignedBy): void
    {
        if ($assignee->id === $assignedBy->id) {
            return;
        }

        $job->loadMissing('lead');

        $assignee->notify(new DesignJobAssignedNotification(
            designJobId: $job->id,
            designJobNumber: (string) ($job->design_job_number ?? '#'.$job->id),
            leadName: $job->lead?->name,
            assignedByUserId: $assignedBy->id,
            assignedByName: $assignedBy->name,
        ));
    }

    public function notifySiteVisitAssigned(SiteVisit $visit, User $assignee, User $assignedBy): void
    {
        if ($assignee->id === $assignedBy->id) {
            return;
        }

        $assignee->notify(new SiteVisitAssignedNotification(
            siteVisitId: $visit->id,
            visitNumber: (string) ($visit->visit_number ?? '#'.$visit->id),
            title: $visit->title,
            visitDate: $visit->visit_date?->toDateString(),
            assignedByUserId: $assignedBy->id,
            assignedByName: $assignedBy->name,
        ));
    }
}
