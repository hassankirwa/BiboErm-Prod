<?php

namespace App\Http\Resources\QualityControl;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QcChecklistTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'product_type' => $this->product_type,
            'context' => $this->context instanceof \BackedEnum ? $this->context->value : $this->context,
            'stage' => $this->stage,
            'description' => $this->description,
            'items' => $this->items ?? [],
            'is_active' => $this->is_active,
            'is_system' => $this->is_system,
            'project_id' => $this->project_id,
            'project' => $this->whenLoaded('project', fn () => new QcProjectSummaryResource($this->project)),
            'parent_template_id' => $this->parent_template_id,
            'created_by' => $this->created_by,
            'version' => $this->version,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
