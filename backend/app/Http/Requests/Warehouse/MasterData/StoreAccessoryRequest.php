<?php

namespace App\Http\Requests\Warehouse\MasterData;

use Illuminate\Foundation\Http\FormRequest;

class StoreAccessoryRequest extends FormRequest
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
            'door_type_id' => ['required', 'exists:door_types,id'],
            'default_bin_id' => ['nullable', 'exists:warehouse_bins,id'],
            'min_stock_qty' => ['nullable', 'numeric', 'min:0'],
            'standard_qty' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
