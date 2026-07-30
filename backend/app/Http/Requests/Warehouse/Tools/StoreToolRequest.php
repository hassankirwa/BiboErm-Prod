<?php

namespace App\Http\Requests\Warehouse\Tools;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreToolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'tool_code' => ['required', 'string', 'max:30', 'unique:warehouse_tools,tool_code'],
            'name' => ['required', 'string', 'max:255'],
            'tool_type' => ['nullable', 'string', 'max:100'],
            'condition' => ['nullable', Rule::in(['good', 'fair', 'damaged', 'retired'])],
            'purchase_date' => ['nullable', 'date'],
            'tracking_mode' => ['nullable', Rule::in(['serialized', 'quantity'])],
            'total_qty' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
