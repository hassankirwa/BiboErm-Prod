<?php

namespace App\Http\Requests\Warehouse\Reservations;

use Illuminate\Foundation\Http\FormRequest;

class ReserveStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string'],
            'emit_events' => ['nullable', 'boolean'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'exists:warehouse_items,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.bom_line_ref' => ['nullable', 'string', 'max:100'],
            'lines.*.required_length_mm' => ['nullable', 'integer', 'min:0'],
            'lines.*.project_bom_line_id' => ['nullable', 'integer'],
        ];
    }
}
