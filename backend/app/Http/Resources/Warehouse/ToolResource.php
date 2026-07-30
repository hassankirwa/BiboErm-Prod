<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ToolResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $activeIssuance = $this->activeIssuance();
        $issuedQty = $this->issuedQty();

        return [
            'id' => $this->id,
            'tool_code' => $this->tool_code,
            'name' => $this->name,
            'tool_type' => $this->tool_type,
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
            ] : null,
        ];
    }
}
