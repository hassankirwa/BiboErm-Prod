<?php

namespace App\Notifications\Assignments;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SiteVisitAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public int $siteVisitId,
        public string $visitNumber,
        public ?string $title,
        public ?string $visitDate,
        public ?int $assignedByUserId,
        public ?string $assignedByName,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $label = $this->title ?: $this->visitNumber;

        return [
            'type' => 'assignment.site_visit',
            'assignment_type' => 'site_visit',
            'site_visit_id' => $this->siteVisitId,
            'visit_number' => $this->visitNumber,
            'title' => $this->title,
            'visit_date' => $this->visitDate,
            'assigned_by_user_id' => $this->assignedByUserId,
            'assigned_by_name' => $this->assignedByName,
            'url' => '/crm/site-visits/'.$this->siteVisitId,
            'message' => "You were assigned site visit {$this->visitNumber}: {$label}.",
        ];
    }
}
