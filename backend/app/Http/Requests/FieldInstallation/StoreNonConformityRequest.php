<?php

namespace App\Http\Requests\FieldInstallation;

use App\Enums\FieldInstallation\NonConformitySeverity;
use App\Enums\FieldInstallation\NonConformityType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNonConformityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'delivery_record_id' => ['nullable', 'integer', 'exists:field_delivery_records,id'],
            'daily_log_id' => ['nullable', 'integer', 'exists:field_installation_daily_logs,id'],
            'nc_type' => ['required', Rule::enum(NonConformityType::class)],
            'severity' => ['required', Rule::enum(NonConformitySeverity::class)],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string'],
            'project_bom_line_id' => ['nullable', 'integer', 'exists:project_bom_lines,id'],
            'warehouse_item_id' => ['nullable', 'integer'],
            'qty_affected' => ['nullable', 'numeric', 'min:0'],
            'field_installation_unit_id' => ['nullable', 'integer', 'exists:field_installation_units,id'],
        ];
    }
}
