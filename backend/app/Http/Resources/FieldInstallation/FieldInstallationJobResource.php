<?php

namespace App\Http\Resources\FieldInstallation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FieldInstallationJobResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'project_id' => $this->project_id,
            'production_order_id' => $this->production_order_id,
            'job_type' => $this->job_type?->value ?? $this->job_type,
            'status' => $this->status?->value ?? $this->status,
            'team_lead_id' => $this->team_lead_id,
            'scheduled_start' => $this->scheduled_start?->toDateString(),
            'scheduled_end' => $this->scheduled_end?->toDateString(),
            'actual_start' => $this->actual_start?->toIso8601String(),
            'actual_end' => $this->actual_end?->toIso8601String(),
            'percent_complete' => $this->percent_complete,
            'site_address' => $this->site_address,
            'site_contact_name' => $this->site_contact_name,
            'site_contact_phone' => $this->site_contact_phone,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'reference' => $this->project->reference,
                'name' => $this->project->name,
                'install_mode' => $this->project->install_mode?->value ?? $this->project->install_mode,
                'stage' => $this->project->stage?->value ?? $this->project->stage,
            ]),
            'team_lead' => $this->whenLoaded('teamLead', fn () => [
                'id' => $this->teamLead->id,
                'name' => $this->teamLead->name,
            ]),
            'members' => FieldInstallationJobMemberResource::collection($this->whenLoaded('activeMembers')),
            'units' => FieldUnitProgressResource::collection($this->whenLoaded('units')),
        ];
    }
}
