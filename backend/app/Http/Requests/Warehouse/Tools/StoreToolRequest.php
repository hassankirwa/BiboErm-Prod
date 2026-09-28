<?php

namespace App\Http\Requests\Warehouse\Tools;

use App\Enums\Warehouse\ToolType;
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
            'tool_type' => ['required', 'string', Rule::enum(ToolType::class)],
            'is_returnable' => ['nullable', 'boolean'],
            'condition' => ['nullable', Rule::in(['good', 'fair', 'damaged', 'retired'])],
            'purchase_date' => ['nullable', 'date'],
            'tracking_mode' => ['nullable', Rule::in(['serialized', 'quantity'])],
            'total_qty' => ['nullable', 'integer', 'min:1'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_returnable')) {
            $this->merge([
                'is_returnable' => filter_var($this->input('is_returnable'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            ]);
        }
    }
}
