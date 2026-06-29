<?php

namespace App\Http\Resources\Crm;

use App\Http\Resources\UserResource;
use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SiteVisitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'visit_number' => $this->visit_number,
            'title' => $this->title,
            'lead_id' => $this->lead_id,
            'deal_id' => $this->deal_id,
            'account_id' => $this->account_id,
            'contact_id' => $this->contact_id,
            'site_address' => $this->site_address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'assigned_field_officer_id' => $this->assigned_field_officer_id,
            'scheduled_by' => $this->scheduled_by,
            'visit_date' => $this->visit_date?->toDateString(),
            'visit_time' => $this->visit_time,
            'visit_purpose' => $this->visit_purpose,
            'measurement_context' => $this->measurement_context?->value ?? $this->measurement_context ?? 'quotation',
            'project_id' => $this->project_id,
            'status' => $this->status?->value ?? $this->status,
            'notes_for_field_officer' => $this->notes_for_field_officer,
            'actual_latitude' => $this->actual_latitude,
            'actual_longitude' => $this->actual_longitude,
            'arrival_at' => $this->arrival_at?->toIso8601String(),
            'completion_at' => $this->completion_at?->toIso8601String(),
            'client_present' => $this->client_present,
            'visit_outcome' => $this->visit_outcome,
            'follow_up_required' => $this->follow_up_required,
            'field_officer_notes' => $this->field_officer_notes,
            'measurement_form_data' => $this->measurement_form_data,
            'measurement_form_status' => $this->measurement_form_status?->value ?? $this->measurement_form_status ?? 'draft',
            'rough_sketch_path' => $this->rough_sketch_path,
            'rough_sketch_url' => $this->rough_sketch_path
                ? BiboStorage::resolveStoredUrl($this->rough_sketch_path)
                : null,
            'approved_by' => $this->approved_by,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'lead' => new LeadResource($this->whenLoaded('lead')),
            'deal' => new DealResource($this->whenLoaded('deal')),
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'name' => $this->project->name,
                'reference' => $this->project->reference,
                'site_address' => $this->project->site_address,
                'stage' => $this->project->stage?->value ?? $this->project->stage,
            ]),
            'assigned_field_officer' => new UserResource($this->whenLoaded('assignedFieldOfficer')),
            'photos' => SiteVisitPhotoResource::collection($this->whenLoaded('photos')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
