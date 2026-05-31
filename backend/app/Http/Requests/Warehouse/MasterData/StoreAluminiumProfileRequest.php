<?php

namespace App\Http\Requests\Warehouse\MasterData;

use Illuminate\Foundation\Http\FormRequest;

class StoreAluminiumProfileRequest extends FormRequest
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
            'profile_family' => ['required', 'string', 'max:100'],
            'width_mm' => ['nullable', 'numeric'],
            'depth_mm' => ['nullable', 'numeric'],
            'finish' => ['nullable', 'string', 'max:100'],
            'weight_per_metre' => ['nullable', 'numeric'],
            'standard_bar_length_mm' => ['nullable', 'integer'],
        ];
    }
}
