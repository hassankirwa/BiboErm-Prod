<?php

namespace App\Http\Requests\Warehouse\Tools;

use App\Enums\Warehouse\ToolIncidentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreToolIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'tool_id' => ['required', 'integer', 'exists:warehouse_tools,id'],
            'issuance_id' => ['nullable', 'integer', 'exists:tool_issuances,id'],
            'field_job_id' => ['nullable', 'integer', 'exists:field_installation_jobs,id'],
            'responsible_user_id' => ['required', 'integer', 'exists:users,id'],
            'type' => ['required', Rule::enum(ToolIncidentType::class)],
            'notes' => ['nullable', 'string'],
            'quantity' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
