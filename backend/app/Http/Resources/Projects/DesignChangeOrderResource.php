<?php

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DesignChangeOrderResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'field_non_conformity_id' => $this->field_non_conformity_id,
            'field_installation_unit_id' => $this->field_installation_unit_id,
            'status' => $this->status instanceof \BackedEnum ? $this->status->value : $this->status,
            'reason' => $this->reason,
            'measurement_notes' => $this->measurement_notes,
            'change_path' => is_array($this->measurement_notes)
                ? ($this->measurement_notes['change_path'] ?? null)
                : null,
            'change_items' => is_array($this->measurement_notes)
                ? ($this->measurement_notes['items'] ?? [])
                : [],
            'scope_bom_line_ids' => $this->scope_bom_line_ids,
            'remeasure_site_visit_id' => $this->remeasure_site_visit_id,
            'revised_bom_version' => $this->revised_bom_version,
            'parent_production_order_id' => $this->parent_production_order_id,
            'remake_production_order_id' => $this->remake_production_order_id,
            'requested_by' => $this->requested_by,
            'approved_by' => $this->approved_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'field_unit' => $this->whenLoaded('fieldUnit', fn () => $this->fieldUnit ? [
                'id' => $this->fieldUnit->id,
                'unit_label' => $this->fieldUnit->unit_label,
                'unit_floor' => $this->fieldUnit->unit_floor,
                'room_location' => $this->fieldUnit->room_location,
                'opening_ref' => $this->fieldUnit->opening_ref,
                'product_type' => $this->fieldUnit->product_type,
                'status' => $this->fieldUnit->status instanceof \BackedEnum
                    ? $this->fieldUnit->status->value
                    : $this->fieldUnit->status,
            ] : null),
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'reference' => $this->project->reference,
                'name' => $this->project->name,
                'stage' => $this->project->stage instanceof \BackedEnum
                    ? $this->project->stage->value
                    : $this->project->stage,
            ]),
            'non_conformity' => $this->whenLoaded('nonConformity', fn () => $this->nonConformity ? [
                'id' => $this->nonConformity->id,
                'nc_type' => $this->nonConformity->nc_type instanceof \BackedEnum
                    ? $this->nonConformity->nc_type->value
                    : $this->nonConformity->nc_type,
                'severity' => $this->nonConformity->severity instanceof \BackedEnum
                    ? $this->nonConformity->severity->value
                    : $this->nonConformity->severity,
                'title' => $this->nonConformity->title,
                'status' => $this->nonConformity->status instanceof \BackedEnum
                    ? $this->nonConformity->status->value
                    : $this->nonConformity->status,
            ] : null),
            'parent_production_order' => $this->whenLoaded('parentProductionOrder', fn () => $this->parentProductionOrder ? [
                'id' => $this->parentProductionOrder->id,
                'reference' => $this->parentProductionOrder->reference,
                'status' => $this->parentProductionOrder->status instanceof \BackedEnum
                    ? $this->parentProductionOrder->status->value
                    : $this->parentProductionOrder->status,
            ] : null),
            'remake_production_order' => $this->whenLoaded('remakeProductionOrder', fn () => $this->remakeProductionOrder ? [
                'id' => $this->remakeProductionOrder->id,
                'reference' => $this->remakeProductionOrder->reference,
                'status' => $this->remakeProductionOrder->status instanceof \BackedEnum
                    ? $this->remakeProductionOrder->status->value
                    : $this->remakeProductionOrder->status,
            ] : null),
            'requester' => $this->whenLoaded('requester', fn () => $this->requester ? [
                'id' => $this->requester->id,
                'name' => $this->requester->name,
            ] : null),
            'approver' => $this->whenLoaded('approver', fn () => $this->approver ? [
                'id' => $this->approver->id,
                'name' => $this->approver->name,
            ] : null),
        ];
    }
}
