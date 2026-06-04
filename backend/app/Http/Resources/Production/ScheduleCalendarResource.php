<?php

namespace App\Http\Resources\Production;

use App\Models\Production\ProductionOrder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProductionOrder */
class ScheduleCalendarResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'project_id' => $this->project_id,
            'project_name' => $this->whenLoaded('project', fn () => $this->project->name),
            'project_stage' => $this->whenLoaded('project', fn () => $this->project->stage?->value),
            'project_completion_percent' => $this->whenLoaded(
                'project',
                fn () => (int) $this->project->completion_percent,
            ),
            'status' => $this->status?->value,
            'current_stage' => $this->current_stage?->value,
            'current_stage_label' => $this->current_stage?->label(),
            'fifo_position' => $this->fifo_position,
            'scheduled_start' => $this->scheduled_start?->toDateString(),
            'scheduled_end' => $this->scheduled_end?->toDateString(),
            'actual_start' => $this->actual_start?->toDateString(),
            'teams' => ProductionOrderTeamResource::collection($this->whenLoaded('teams')),
            'material_readiness' => $this->when(
                $this->resource->getAttribute('material_readiness') !== null,
                fn () => $this->resource->getAttribute('material_readiness'),
            ),
            'glass_status' => $this->when(
                $this->resource->getAttribute('glass_status') !== null,
                fn () => $this->resource->getAttribute('glass_status'),
            ),
        ];
    }
}
