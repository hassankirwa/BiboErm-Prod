<?php

namespace App\Http\Resources\FieldInstallation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FieldUnitProgressResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'job_id' => $this->job_id,
            'project_bom_line_id' => $this->project_bom_line_id,
            'measurement_line_key' => $this->measurement_line_key,
            'opening_ref' => $this->opening_ref,
            'product_type' => $this->product_type,
            'unit_floor' => $this->unit_floor,
            'room_location' => $this->room_location,
            'quantity' => $this->quantity,
            'measurement_snapshot' => $this->measurement_snapshot,
            'project_floor_id' => $this->project_floor_id,
            'unit_label' => $this->unit_label,
            'status' => $this->status?->value ?? $this->status,
            'installed_at' => $this->installed_at?->toIso8601String(),
            'installed_by' => $this->installed_by,
            'snag_notes' => $this->snag_notes,
            'misfit_notes' => $this->misfit_notes,
            'sort_order' => $this->sort_order,
            'photos' => FieldInstallationPhotoResource::collection($this->whenLoaded('photos')),
        ];
    }
}
