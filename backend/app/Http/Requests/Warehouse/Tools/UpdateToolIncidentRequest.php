<?php

namespace App\Http\Requests\Warehouse\Tools;

use App\Enums\Warehouse\ToolIncidentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateToolIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status' => [
                'required',
                Rule::in([
                    ToolIncidentStatus::InRepair->value,
                    ToolIncidentStatus::Repaired->value,
                    ToolIncidentStatus::Replaced->value,
                    ToolIncidentStatus::WrittenOff->value,
                ]),
            ],
            'resolution_notes' => ['nullable', 'string'],
            'replacement_tool_id' => ['nullable', 'integer', 'exists:warehouse_tools,id'],
            'create_replacement' => ['nullable', 'boolean'],
            'replacement' => ['nullable', 'array'],
            'replacement.tool_code' => ['nullable', 'string', 'max:30'],
            'replacement.name' => ['nullable', 'string', 'max:255'],
            'replacement.tool_type' => ['nullable', 'string', 'max:100'],
        ];
    }
}
