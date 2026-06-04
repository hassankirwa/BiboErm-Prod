<?php

namespace App\Http\Requests\QualityControl;

use App\Enums\QualityControl\QcInspectionResult;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitQcInspectionRequest extends FormRequest
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
            'result' => ['required', 'string', Rule::in([
                QcInspectionResult::Pass->value,
                QcInspectionResult::Fail->value,
                QcInspectionResult::ConditionalPass->value,
            ])],
            'checklist_responses' => ['sometimes', 'array'],
            'custom_items' => ['sometimes', 'array'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
