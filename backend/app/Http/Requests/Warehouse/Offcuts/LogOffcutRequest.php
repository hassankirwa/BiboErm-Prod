<?php

namespace App\Http\Requests\Warehouse\Offcuts;

use Illuminate\Foundation\Http\FormRequest;

class LogOffcutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'item_id' => ['required', 'exists:warehouse_items,id'],
            'bin_id' => ['required', 'exists:warehouse_bins,id'],
            'length_mm' => ['required', 'integer', 'min:1'],
            'quantity_pieces' => ['nullable', 'integer', 'min:1'],
            'source_project_id' => ['nullable', 'exists:projects,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
