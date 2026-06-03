<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ToolResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $activeIssuance = $this->activeIssuance();

        return [
            'id' => $this->id,
            'tool_code' => $this->tool_code,
            'name' => $this->name,
            'tool_type' => $this->tool_type,
            'condition' => $this->condition?->value ?? $this->condition,
            'purchase_date' => $this->purchase_date?->toDateString(),
            'is_active' => $this->is_active,
            'is_issued' => (bool) $activeIssuance,
            'active_issuance' => $activeIssuance ? [
                'id' => $activeIssuance->id,
                'project_id' => $activeIssuance->project_id,
                'issued_to' => $activeIssuance->issued_to,
                'issue_date' => $activeIssuance->issue_date?->toDateString(),
            ] : null,
        ];
    }
}
