<?php

namespace App\Http\Requests\Warehouse\Locations;

use Illuminate\Foundation\Http\FormRequest;

class StoreSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'deck_id' => ['required', 'exists:warehouse_decks,id'],
            'door_type_id' => ['nullable', 'exists:door_types,id'],
            'code' => ['required', 'string', 'max:30'],
            'name' => ['required', 'string', 'max:255'],
            'section_type' => ['required', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }
}
