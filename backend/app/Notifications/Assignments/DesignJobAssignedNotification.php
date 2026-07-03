<?php

namespace App\Notifications\Assignments;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DesignJobAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public int $designJobId,
        public string $designJobNumber,
        public ?string $leadName,
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
        $label = $this->leadName ?: $this->designJobNumber;

        return [
            'type' => 'assignment.design_job',
            'assignment_type' => 'design_job',
            'design_job_id' => $this->designJobId,
            'design_job_number' => $this->designJobNumber,
            'lead_name' => $this->leadName,
            'assigned_by_user_id' => $this->assignedByUserId,
            'assigned_by_name' => $this->assignedByName,
            'url' => '/design/jobs/'.$this->designJobId,
            'message' => "You were assigned design job {$this->designJobNumber} for {$label}.",
        ];
    }
}
