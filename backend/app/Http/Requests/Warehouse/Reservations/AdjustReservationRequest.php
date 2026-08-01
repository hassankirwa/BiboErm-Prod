<?php

namespace App\Http\Requests\Warehouse\Reservations;

use Illuminate\Foundation\Http\FormRequest;

class AdjustReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'item_id' => ['required', 'integer', 'exists:warehouse_items,id'],
            'quantity_reserved' => ['required', 'numeric', 'min:0'],
            'bom_line_ref' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
