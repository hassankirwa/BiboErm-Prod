<?php

namespace App\Http\Resources\FieldInstallation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FieldDeliveryLineResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_bom_line_id' => $this->project_bom_line_id,
            'warehouse_item_id' => $this->warehouse_item_id,
            'description' => $this->description,
            'qty_expected' => $this->qty_expected,
            'qty_received' => $this->qty_received,
            'unit' => $this->unit,
            'condition_notes' => $this->condition_notes,
        ];
    }
}
