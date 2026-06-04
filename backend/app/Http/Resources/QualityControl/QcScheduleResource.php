<?php

namespace App\Http\Resources\QualityControl;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QcScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'context' => $this->context instanceof \BackedEnum ? $this->context->value : $this->context,
            'frequency' => $this->frequency instanceof \BackedEnum ? $this->frequency->value : $this->frequency,
            'frequency_interval' => $this->frequency_interval,
            'warehouse_deck_slug' => $this->warehouse_deck_slug,
            'warehouse_section_id' => $this->warehouse_section_id,
            'tool_scope' => $this->tool_scope,
            'assigned_role' => $this->assigned_role,
            'assigned_user_id' => $this->assigned_user_id,
            'template_id' => $this->template_id,
            'next_due_at' => $this->next_due_at?->toIso8601String(),
            'last_run_at' => $this->last_run_at?->toIso8601String(),
            'is_active' => $this->is_active,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
