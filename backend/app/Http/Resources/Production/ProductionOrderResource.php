<?php

namespace App\Http\Resources\Production;

use App\Models\Production\ProductionOrder;
use App\Services\Production\ProductionGlassRequirementService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProductionOrder */
class ProductionOrderResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'project_id' => $this->project_id,
            'parent_production_order_id' => $this->parent_production_order_id,
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'reference' => $this->project->reference,
                'name' => $this->project->name,
                'stage' => $this->project->stage?->value,
                'completion_percent' => (int) $this->project->completion_percent,
                'location_type' => $this->project->location_type,
                'install_mode' => $this->project->install_mode instanceof \BackedEnum
                    ? $this->project->install_mode->value
                    : $this->project->install_mode,
            ]),
            'status' => $this->status?->value,
            'current_stage' => $this->current_stage?->value,
            'current_stage_label' => $this->current_stage?->label(),
            'glass_assembly' => app(ProductionGlassRequirementService::class)
                ->glassAssemblyContext($this->project_id),
            'fifo_position' => $this->fifo_position,
            'scheduled_start' => $this->scheduled_start?->toDateString(),
            'scheduled_end' => $this->scheduled_end?->toDateString(),
            'actual_start' => $this->actual_start?->toDateString(),
            'actual_end' => $this->actual_end?->toDateString(),
            'assigned_team_lead' => $this->assigned_team_lead,
            'stage_logs' => ProductionStageLogResource::collection($this->whenLoaded('stageLogs')),
            'teams' => ProductionOrderTeamResource::collection($this->whenLoaded('teams')),
            'cutting_sheets' => CuttingSheetResource::collection($this->whenLoaded('cuttingSheets')),
            'material_releases' => ProductionMaterialReleaseResource::collection($this->whenLoaded('materialReleases')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
