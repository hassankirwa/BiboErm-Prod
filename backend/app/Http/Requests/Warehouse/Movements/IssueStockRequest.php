<?php

namespace App\Http\Requests\Warehouse\Movements;

use Illuminate\Foundation\Http\FormRequest;

class IssueStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'project_id' => ['nullable', 'exists:projects,id'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'exists:warehouse_items,id'],
            'lines.*.from_bin_id' => ['required', 'exists:warehouse_bins,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
