<?php

namespace App\Http\Requests\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcScheduleFrequency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQcScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('qc.schedules.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'context' => ['required', 'string', Rule::in(QcInspectionContext::values())],
            'frequency' => ['required', 'string', Rule::enum(QcScheduleFrequency::class)],
            'frequency_interval' => ['sometimes', 'integer', 'min:1'],
            'warehouse_deck_slug' => ['nullable', 'string', 'max:40'],
            'warehouse_section_id' => ['nullable', 'integer'],
            'tool_scope' => ['nullable', 'string', 'max:30'],
            'assigned_role' => ['nullable', 'string', 'max:50'],
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'template_id' => ['nullable', 'integer', 'exists:qc_checklist_templates,id'],
            'next_due_at' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
