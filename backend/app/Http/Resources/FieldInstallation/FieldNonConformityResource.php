<?php

namespace App\Http\Resources\FieldInstallation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FieldNonConformityResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'job_id' => $this->job_id,
            'project_id' => $this->project_id,
            'delivery_record_id' => $this->delivery_record_id,
            'daily_log_id' => $this->daily_log_id,
            'nc_type' => $this->nc_type?->value ?? $this->nc_type,
            'severity' => $this->severity?->value ?? $this->severity,
            'status' => $this->status?->value ?? $this->status,
            'title' => $this->title,
            'description' => $this->description,
            'project_bom_line_id' => $this->project_bom_line_id,
            'warehouse_item_id' => $this->warehouse_item_id,
            'qty_affected' => $this->qty_affected,
            'reported_by' => $this->reported_by,
            'reported_at' => $this->reported_at?->toIso8601String(),
            'acknowledged_by' => $this->acknowledged_by,
            'acknowledged_at' => $this->acknowledged_at?->toIso8601String(),
            'resolved_by' => $this->resolved_by,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'resolution_notes' => $this->resolution_notes,
        ];
    }
}
