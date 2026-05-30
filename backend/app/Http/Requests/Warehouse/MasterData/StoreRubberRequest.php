<?php

namespace App\Http\Requests\Warehouse\MasterData;

use Illuminate\Foundation\Http\FormRequest;

class StoreRubberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'sku' => ['required', 'string', 'max:50', 'unique:warehouse_items,sku'],
            'name' => ['required', 'string', 'max:255'],
            'unit_of_measure' => ['required', 'string', 'max:20'],
            'min_stock_qty' => ['nullable', 'numeric', 'min:0'],
            'compatible_profile_ids' => ['nullable', 'array'],
            'compatible_profile_ids.*' => ['integer', 'exists:warehouse_items,id'],
            'default_section_id' => ['nullable', 'exists:warehouse_sections,id'],
        ];
    }
}
