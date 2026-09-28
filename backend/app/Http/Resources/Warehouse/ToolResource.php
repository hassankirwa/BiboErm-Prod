<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ToolResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $activeIssuance = $this->activeIssuance();
        if ($activeIssuance) {
            $activeIssuance->loadMissing(['project', 'issuedToUser']);
        }
        $issuedQty = $this->issuedQty();

        $toolType = $this->tool_type;

        return [
            'id' => $this->id,
            'tool_code' => $this->tool_code,
            'name' => $this->name,
            'tool_type' => $toolType?->value ?? $toolType,
            'tool_type_label' => $toolType?->label(),
            'is_returnable' => (bool) ($this->is_returnable ?? true),
            'condition' => $this->condition?->value ?? $this->condition,
            'purchase_date' => $this->purchase_date?->toDateString(),
            'is_active' => $this->is_active,
            'tracking_mode' => $this->tracking_mode?->value ?? $this->tracking_mode ?? 'serialized',
            'total_qty' => (int) $this->total_qty,
            'available_qty' => $this->availableQty(),
            'on_site_qty' => $this->onSiteQty(),
            'issued_qty' => $issuedQty,
            'qty_in_repair' => (int) $this->qty_in_repair,
            'is_issued' => $issuedQty > 0,
            'active_issuance' => $activeIssuance ? [
                'id' => $activeIssuance->id,
                'project_id' => $activeIssuance->project_id,
                'issued_to' => $activeIssuance->issued_to,
                'quantity' => (int) $activeIssuance->quantity,
                'issue_date' => $activeIssuance->issue_date?->toDateString(),
                'project' => $activeIssuance->project ? [
                    'id' => $activeIssuance->project->id,
                    'reference' => $activeIssuance->project->reference,
                    'name' => $activeIssuance->project->name,
                    'stage' => $activeIssuance->project->stage?->value ?? $activeIssuance->project->stage,
                ] : null,
                'issued_to_user' => $activeIssuance->issuedToUser ? [
                    'id' => $activeIssuance->issuedToUser->id,
                    'name' => $activeIssuance->issuedToUser->name,
                ] : null,
            ] : null,
        ];
    }
}
