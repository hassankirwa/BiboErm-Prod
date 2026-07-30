<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ToolIncidentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tool_id' => $this->tool_id,
            'issuance_id' => $this->issuance_id,
            'field_job_id' => $this->field_job_id,
            'responsible_user_id' => $this->responsible_user_id,
            'reported_by' => $this->reported_by,
            'type' => $this->type?->value ?? $this->type,
            'status' => $this->status?->value ?? $this->status,
            'notes' => $this->notes,
            'resolution_notes' => $this->resolution_notes,
            'quantity' => (int) $this->quantity,
            'replacement_tool_id' => $this->replacement_tool_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'tool' => $this->whenLoaded('tool', fn () => [
                'id' => $this->tool->id,
                'tool_code' => $this->tool->tool_code,
                'name' => $this->tool->name,
            ]),
            'responsible_user' => $this->whenLoaded('responsibleUser', fn () => [
                'id' => $this->responsibleUser->id,
                'name' => $this->responsibleUser->name,
            ]),
            'reported_by_user' => $this->whenLoaded('reportedByUser', fn () => [
                'id' => $this->reportedByUser->id,
                'name' => $this->reportedByUser->name,
            ]),
            'replacement_tool' => $this->whenLoaded('replacementTool', fn () => $this->replacementTool ? [
                'id' => $this->replacementTool->id,
                'tool_code' => $this->replacementTool->tool_code,
                'name' => $this->replacementTool->name,
            ] : null),
        ];
    }
}
