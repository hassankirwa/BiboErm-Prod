<?php

namespace App\Http\Requests\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQcTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('qc.templates.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'context' => ['required', 'string', Rule::in(QcInspectionContext::values())],
            'description' => ['nullable', 'string'],
            'product_type' => ['nullable', 'string', 'max:64'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.key' => ['required', 'string', 'max:80'],
            'items.*.label' => ['required', 'string', 'max:255'],
            'items.*.type' => ['required', 'string', 'max:32'],
            'items.*.required' => ['sometimes', 'boolean'],
            'items.*.help_text' => ['nullable', 'string'],
            'items.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'parent_template_id' => ['nullable', 'integer', 'exists:qc_checklist_templates,id'],
        ];
    }
}
