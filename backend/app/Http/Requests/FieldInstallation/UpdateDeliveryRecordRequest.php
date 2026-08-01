<?php

namespace App\Http\Requests\FieldInstallation;

use App\Enums\FieldInstallation\DeliveryCondition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDeliveryRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'received_at' => ['sometimes', 'nullable', 'date'],
            'delivery_condition' => ['sometimes', Rule::enum(DeliveryCondition::class)],
            'vehicle_reg' => ['sometimes', 'nullable', 'string', 'max:30'],
            'driver_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'packing_list_ref' => ['sometimes', 'nullable', 'string', 'max:60'],
            'expected_units' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'received_units' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'lines' => ['sometimes', 'array'],
            'lines.*.description' => ['required_with:lines', 'string', 'max:255'],
            'lines.*.qty_expected' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.qty_received' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.unit' => ['nullable', 'string', 'max:30'],
            'lines.*.condition_notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
