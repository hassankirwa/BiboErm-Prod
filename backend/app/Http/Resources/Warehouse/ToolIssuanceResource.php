<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ToolIssuanceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tool_id' => $this->tool_id,
            'project_id' => $this->project_id,
            'issued_to' => $this->issued_to,
            'issued_by' => $this->issued_by,
            'quantity' => (int) $this->quantity,
            'issue_date' => $this->issue_date?->toDateString(),
            'return_date' => $this->return_date?->toDateString(),
            'condition_out' => $this->condition_out,
            'condition_in' => $this->condition_in,
            'damage_notes' => $this->damage_notes,
            'is_open' => $this->return_date === null,
            'tool' => $this->whenLoaded('tool', fn () => $this->tool ? [
                'id' => $this->tool->id,
                'tool_code' => $this->tool->tool_code,
                'name' => $this->tool->name,
                'tool_type' => $this->tool->tool_type,
                'tracking_mode' => $this->tool->tracking_mode?->value ?? $this->tool->tracking_mode,
            ] : null),
            'project' => $this->whenLoaded('project', fn () => $this->project ? [
                'id' => $this->project->id,
                'reference' => $this->project->reference,
                'name' => $this->project->name,
                'stage' => $this->project->stage?->value ?? $this->project->stage,
                'install_mode' => $this->project->install_mode?->value ?? $this->project->install_mode,
            ] : null),
            'issued_to_user' => $this->whenLoaded('issuedToUser', fn () => $this->issuedToUser ? [
                'id' => $this->issuedToUser->id,
                'name' => $this->issuedToUser->name,
                'email' => $this->issuedToUser->email,
            ] : null),
            'issued_by_user' => $this->whenLoaded('issuedByUser', fn () => $this->issuedByUser ? [
                'id' => $this->issuedByUser->id,
                'name' => $this->issuedByUser->name,
            ] : null),
            'field_job' => $this->when(
                $this->relationLoaded('fieldToolAssignment') && $this->fieldToolAssignment?->relationLoaded('job'),
                fn () => $this->fieldToolAssignment?->job ? [
                    'id' => $this->fieldToolAssignment->job->id,
                    'reference' => $this->fieldToolAssignment->job->reference,
                    'status' => $this->fieldToolAssignment->job->status?->value
                        ?? $this->fieldToolAssignment->job->status,
                ] : null,
            ),
        ];
    }
}
