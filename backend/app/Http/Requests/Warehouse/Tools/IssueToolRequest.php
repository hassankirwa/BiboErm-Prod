<?php

namespace App\Http\Requests\Warehouse\Tools;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IssueToolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'issued_to' => ['required', 'exists:users,id'],
            'project_id' => ['required', 'exists:projects,id'],
            'condition_out' => ['nullable', Rule::in(['good', 'fair', 'damaged', 'retired'])],
            'quantity' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
