<?php

namespace App\Listeners\Projects;

use App\Enums\FieldInstallation\DeliveryCondition;
use App\Enums\ProjectStage;
use App\Events\FieldInstallation\FieldDeliveryRecorded;
use App\Models\FieldInstallation\FieldDeliveryRecord;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectStageService;

/**
 * When a complete delivery is accepted on site, advance the project from in_transit to installation.
 */
class AdvanceProjectOnFieldDeliveryAccepted
{
    public function __construct(
        protected ProjectStageService $projectStages,
    ) {}

    public function handle(FieldDeliveryRecorded $event): void
    {
        $record = FieldDeliveryRecord::query()->find($event->deliveryRecordId);

        if (! $record) {
            return;
        }

        $condition = $record->delivery_condition instanceof DeliveryCondition
            ? $record->delivery_condition
            : DeliveryCondition::tryFrom((string) $record->delivery_condition);

        if ($condition !== DeliveryCondition::Complete) {
            return;
        }

        $project = Project::query()->find($event->projectId);

        if (! $project) {
            return;
        }

        if ($this->projectStages->currentStage($project) !== ProjectStage::InTransit) {
            return;
        }

        $actor = User::query()->find($event->receivedByUserId);

        $this->projectStages->transition(
            $project,
            ProjectStage::Installation,
            $actor,
            ['reason' => 'Site delivery accepted (complete)', 'force' => true],
        );
    }
}
