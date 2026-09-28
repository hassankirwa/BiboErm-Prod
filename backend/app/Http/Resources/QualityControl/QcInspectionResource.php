<?php

namespace App\Http\Resources\QualityControl;

use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QcInspectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $canViewInternal = $request->user()?->can('qc.manage') ?? false;

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'project_id' => $this->project_id,
            'project_document_id' => $this->project_document_id,
            'opening_code' => $this->opening_code,
            'project' => $this->whenLoaded('project', fn () => new QcProjectSummaryResource($this->project)),
            'defects_count' => $this->whenCounted('defects'),
            'production_order_id' => $this->production_order_id,
            'goods_receipt_id' => $this->goods_receipt_id,
            'field_installation_job_id' => $this->field_installation_job_id,
            'warehouse_deck_slug' => $this->warehouse_deck_slug,
            'warehouse_section_id' => $this->warehouse_section_id,
            'tool_id' => $this->tool_id,
            'context' => $this->context instanceof \BackedEnum ? $this->context->value : $this->context,
            'stage' => $this->stage,
            'template_id' => $this->template_id,
            'result' => $this->result instanceof \BackedEnum ? $this->result->value : $this->result,
            'can_skip' => $this->result instanceof \BackedEnum
                ? ($this->result->value === 'pending' && in_array(
                    $this->context instanceof \BackedEnum ? $this->context->value : $this->context,
                    ['production_qc_pre_check', 'production_in_process'],
                    true,
                ))
                : false,
            'inspector_id' => $this->inspector_id,
            'completed_by' => $this->completed_by,
            'checklist_responses' => $this->checklist_responses ?? [],
            'custom_items' => $this->custom_items ?? [],
            'notes' => $this->notes,
            'internal_notes' => $this->when($canViewInternal, $this->internal_notes),
            'inspected_at' => $this->inspected_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'template' => $this->whenLoaded('template', fn () => new QcChecklistTemplateResource($this->template)),
            'defects' => $this->whenLoaded('defects', fn () => QcDefectResource::collection($this->defects)),
            'photos' => $this->whenLoaded('photos', fn () => $this->photos->map(fn ($photo) => [
                'id' => $photo->id,
                'inspection_id' => $photo->inspection_id,
                'defect_id' => $photo->defect_id,
                'checklist_key' => $photo->checklist_key,
                'file_path' => $photo->file_path,
                'url' => BiboStorage::resolvePrivateApiUrl($photo->file_path),
                'firebase_url' => $photo->firebase_url,
                'caption' => $photo->caption,
                'uploaded_by' => $photo->uploaded_by,
                'created_at' => $photo->created_at?->toIso8601String(),
            ])),
            'inspector' => $this->whenLoaded('inspector', fn () => $this->inspector ? [
                'id' => $this->inspector->id,
                'name' => $this->inspector->name,
            ] : null),
        ];
    }
}
