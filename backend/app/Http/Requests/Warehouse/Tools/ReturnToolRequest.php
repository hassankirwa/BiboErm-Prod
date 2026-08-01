<?php

namespace App\Http\Requests\Warehouse\Tools;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReturnToolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'disposition' => ['nullable', Rule::in(['returned', 'damaged', 'lost', 'replaced'])],
            'condition_in' => ['nullable', Rule::in(['good', 'fair', 'damaged', 'lost', 'retired'])],
            'damage_notes' => ['nullable', 'string'],
            'create_replacement' => ['nullable', 'boolean'],
            'replacement' => ['nullable', 'array'],
            'replacement.tool_code' => ['nullable', 'string', 'max:30'],
            'replacement.name' => ['nullable', 'string', 'max:255'],
            'replacement.tool_type' => ['nullable', 'string', 'max:100'],
        ];
    }
}
