<?php

namespace App\Http\Requests\FieldInstallation;

use Illuminate\Foundation\Http\FormRequest;

class StoreFieldToolIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'tool_id' => ['required', 'integer', 'exists:warehouse_tools,id'],
            'issued_to' => ['required', 'integer', 'exists:users,id'],
            'condition_out' => ['nullable', 'string', 'max:32'],
            'expected_return_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
