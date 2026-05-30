<?php

namespace App\Http\Requests\Warehouse\Movements;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdjustStockRequest extends FormRequest
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
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'exists:warehouse_items,id'],
            'lines.*.bin_id' => ['required', 'exists:warehouse_bins,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.direction' => ['required', Rule::in(['increase', 'decrease'])],
        ];
    }
}
