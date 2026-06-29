<?php

namespace App\Http\Resources\Projects;

use App\Support\ProjectStageGate;
use App\Support\ProjectStageLabels;
use App\Support\SiteAssessmentData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectDesignQueueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $stage = $this->stage?->value ?? (string) $this->stage;
        $stageData = is_array($this->stage_data) ? $this->stage_data : null;
        $readiness = ProjectStageGate::readiness($this->resource);

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'name' => $this->name,
            'stage' => $stage,
            'stage_label' => ProjectStageLabels::designQueue($stage),
            'quoted_amount' => $this->quoted_amount,
            'deposit_received' => $this->deposit_received,
            'has_production_measurement' => SiteAssessmentData::hasProductionMeasurement($stageData),
            'has_design_document' => $readiness['has_design_document'],
            'account' => $this->whenLoaded('account', fn () => [
                'id' => $this->account?->id,
                'name' => $this->account?->name,
            ]),
            'project_manager' => $this->whenLoaded('projectManager', fn () => [
                'id' => $this->projectManager?->id,
                'name' => $this->projectManager?->name,
            ]),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
