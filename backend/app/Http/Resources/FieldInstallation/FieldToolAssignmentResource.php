<?php

namespace App\Http\Resources\FieldInstallation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FieldToolAssignmentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $issuance = $this->toolIssuance;

        return [
            'id' => $this->id,
            'job_id' => $this->job_id,
            'tool_issuance_id' => $this->tool_issuance_id,
            'assigned_by' => $this->assigned_by,
            'expected_return_date' => $this->expected_return_date?->toDateString(),
            'returned_at' => $this->returned_at?->toIso8601String(),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'tool_issuance' => $issuance ? [
                'id' => $issuance->id,
                'tool_id' => $issuance->tool_id,
                'quantity' => (int) $issuance->quantity,
                'issued_to' => $issuance->issued_to,
                'issue_date' => $issuance->issue_date?->toDateString(),
                'return_date' => $issuance->return_date?->toDateString(),
                'condition_out' => $issuance->condition_out,
                'condition_in' => $issuance->condition_in,
                'damage_notes' => $issuance->damage_notes,
                'tool' => $issuance->relationLoaded('tool') && $issuance->tool ? [
                    'id' => $issuance->tool->id,
                    'tool_code' => $issuance->tool->tool_code,
                    'name' => $issuance->tool->name,
                    'tool_type' => $issuance->tool->tool_type?->value ?? $issuance->tool->tool_type,
                    'is_returnable' => (bool) ($issuance->tool->is_returnable ?? true),
                    'condition' => $issuance->tool->condition?->value ?? $issuance->tool->condition,
                    'tracking_mode' => $issuance->tool->tracking_mode?->value ?? $issuance->tool->tracking_mode,
                    'total_qty' => (int) $issuance->tool->total_qty,
                    'available_qty' => $issuance->tool->availableQty(),
                    'on_site_qty' => $issuance->tool->onSiteQty(),
                    'qty_in_repair' => (int) $issuance->tool->qty_in_repair,
                ] : null,
                'issued_to_user' => $issuance->relationLoaded('issuedToUser') && $issuance->issuedToUser ? [
                    'id' => $issuance->issuedToUser->id,
                    'name' => $issuance->issuedToUser->name,
                ] : null,
            ] : null,
            'assigned_by_user' => $this->whenLoaded('assignedByUser', fn () => $this->assignedByUser ? [
                'id' => $this->assignedByUser->id,
                'name' => $this->assignedByUser->name,
            ] : null),
        ];
    }
}
