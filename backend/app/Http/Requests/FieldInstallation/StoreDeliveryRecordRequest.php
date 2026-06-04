<?php

namespace App\Http\Requests\FieldInstallation;

use App\Enums\FieldInstallation\DeliveryCondition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDeliveryRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'transport_order_id' => ['nullable', 'integer'],
            'received_at' => ['nullable', 'date'],
            'delivery_condition' => ['required', Rule::enum(DeliveryCondition::class)],
            'vehicle_reg' => ['nullable', 'string', 'max:30'],
            'driver_name' => ['nullable', 'string', 'max:120'],
            'packing_list_ref' => ['nullable', 'string', 'max:60'],
            'expected_units' => ['nullable', 'integer', 'min:0'],
            'received_units' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'acknowledge_partial_without_nc' => ['nullable', 'boolean'],
            'lines' => ['nullable', 'array'],
            'lines.*.project_bom_line_id' => ['nullable', 'integer', 'exists:project_bom_lines,id'],
            'lines.*.warehouse_item_id' => ['nullable', 'integer'],
            'lines.*.description' => ['required_with:lines', 'string', 'max:255'],
            'lines.*.qty_expected' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.qty_received' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.unit' => ['nullable', 'string', 'max:20'],
            'lines.*.condition_notes' => ['nullable', 'string'],
        ];
    }
}
