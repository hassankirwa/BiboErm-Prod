<?php

namespace App\Http\Resources;

use App\Support\ProjectStageGate;
use App\Support\ProjectSiteLocation;
use App\Support\SiteAssessmentImages;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'name' => $this->name,
            'deal_id' => $this->deal_id,
            'contact_id' => $this->contact_id,
            'account_id' => $this->account_id,
            'type' => $this->type,
            'location_type' => $this->location_type,
            'site_address' => $this->site_address,
            'resolved_site_address' => ProjectSiteLocation::resolve($this->resource)['site_address'],
            'stage' => $this->stage?->value ?? $this->stage,
            'completion_percent' => $this->completion_percent,
            'priority' => $this->priority,
            'quoted_amount' => $this->quoted_amount,
            'deposit_received' => $this->deposit_received,
            'overage_buffer_percent' => $this->overage_buffer_percent,
            'projected_start' => $this->projected_start?->toDateString(),
            'projected_end' => $this->projected_end?->toDateString(),
            'actual_start' => $this->actual_start?->toDateString(),
            'actual_end' => $this->actual_end?->toDateString(),
            'sales_rep_id' => $this->sales_rep_id,
            'project_manager_id' => $this->project_manager_id,
            'client_notes' => $this->client_notes,
            'internal_notes' => $this->internal_notes,
            'stage_data' => $this->enrichedStageData(),
            'stage_readiness' => ProjectStageGate::readiness($this->resource),
            'is_nairobi_two_phase' => $this->isNairobiTwoPhase(),
            'is_fabrication_only_nairobi' => false,
            'sales_rep' => new UserResource($this->whenLoaded('salesRep')),
            'project_manager' => new UserResource($this->whenLoaded('projectManager')),
            'contact' => $this->whenLoaded('contact'),
            'account' => $this->whenLoaded('account'),
            'latest_bom' => $this->when(
                $this->relationLoaded('latestBom') && $this->latestBom !== null,
                fn () => [
                    'id' => $this->latestBom?->id,
                    'version' => $this->latestBom?->version,
                    'status' => $this->latestBom?->status,
                    'line_count' => $this->latestBom?->lines?->count(),
                ]
            ),
            'engineers' => $this->whenLoaded('engineers', fn () => $this->engineers->map(fn ($engineer) => [
                'id' => $engineer->id,
                'role' => $engineer->role,
                'assigned_at' => $engineer->assigned_at?->toIso8601String(),
                'user' => $engineer->relationLoaded('user') ? [
                    'id' => $engineer->user?->id,
                    'name' => $engineer->user?->name,
                    'email' => $engineer->user?->email,
                ] : null,
            ])->values()),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function enrichedStageData(): ?array
    {
        $data = $this->stage_data;

        if (! is_array($data)) {
            return null;
        }

        if (isset($data['site_assessment']) && is_array($data['site_assessment'])) {
            $data['site_assessment'] = SiteAssessmentImages::enrichUrls($data['site_assessment']);
        }

        return $data;
    }
}
