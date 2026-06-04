<?php

namespace App\Http\Resources\QualityControl;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QcDefectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'inspection_id' => $this->inspection_id,
            'checklist_key' => $this->checklist_key,
            'severity' => $this->severity instanceof \BackedEnum ? $this->severity->value : $this->severity,
            'description' => $this->description,
            'status' => $this->status instanceof \BackedEnum ? $this->status->value : $this->status,
            'reported_by' => $this->reported_by,
            'resolution_notes' => $this->resolution_notes,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'inspection' => $this->whenLoaded('inspection', fn () => [
                'id' => $this->inspection->id,
                'reference' => $this->inspection->reference,
                'context' => $this->inspection->context instanceof \BackedEnum
                    ? $this->inspection->context->value
                    : $this->inspection->context,
                'project_id' => $this->inspection->project_id,
                'goods_receipt_id' => $this->inspection->goods_receipt_id,
                'project' => $this->inspection->relationLoaded('project') && $this->inspection->project
                    ? [
                        'id' => $this->inspection->project->id,
                        'reference' => $this->inspection->project->reference,
                        'name' => $this->inspection->project->name,
                    ]
                    : null,
            ]),
            'reported_by_user' => $this->whenLoaded('reportedByUser', fn () => $this->reportedByUser ? [
                'id' => $this->reportedByUser->id,
                'name' => $this->reportedByUser->name,
            ] : null),
        ];
    }
}
