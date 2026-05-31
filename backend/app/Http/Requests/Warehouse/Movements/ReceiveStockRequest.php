<?php

namespace App\Http\Requests\Warehouse\Movements;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'goods_receipt_id' => ['nullable', 'integer'],
            'reference_type' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'exists:warehouse_items,id'],
            'lines.*.to_bin_id' => ['nullable', 'exists:warehouse_bins,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
