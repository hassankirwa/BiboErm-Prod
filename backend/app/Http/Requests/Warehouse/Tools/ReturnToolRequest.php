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
            'condition_in' => ['nullable', Rule::in(['good', 'fair', 'damaged', 'retired'])],
            'damage_notes' => ['nullable', 'string'],
        ];
    }
}
