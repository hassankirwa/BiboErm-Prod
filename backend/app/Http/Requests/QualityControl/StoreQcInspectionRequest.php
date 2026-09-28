<?php

namespace App\Http\Requests\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQcInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('qc.inspect') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'context' => ['required', 'string', Rule::in(QcInspectionContext::values())],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'production_order_id' => ['nullable', 'integer', 'exists:production_orders,id'],
            'goods_receipt_id' => ['nullable', 'integer'],
            'field_installation_job_id' => ['nullable', 'integer'],
            'warehouse_deck_slug' => ['nullable', 'string', 'max:40'],
            'warehouse_section_id' => ['nullable', 'integer'],
            'tool_id' => ['nullable', 'integer', 'exists:warehouse_tools,id'],
            'stage' => ['nullable', 'string', 'max:64'],
            'opening_code' => ['nullable', 'string', 'max:64'],
            'project_document_id' => ['nullable', 'integer', 'exists:project_documents,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
