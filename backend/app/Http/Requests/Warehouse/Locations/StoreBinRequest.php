<?php

namespace App\Http\Requests\Warehouse\Locations;

use Illuminate\Foundation\Http\FormRequest;

class StoreBinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'section_id' => ['required', 'exists:warehouse_sections,id'],
            'code' => ['required', 'string', 'max:30'],
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }
}
