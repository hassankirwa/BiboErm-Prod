<?php

namespace App\Http\Requests\FieldInstallation;

use App\Enums\FieldInstallation\FieldJobType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFieldJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'production_order_id' => ['nullable', 'integer', 'exists:production_orders,id'],
            'job_type' => ['nullable', Rule::enum(FieldJobType::class)],
            'team_lead_id' => ['nullable', 'integer', 'exists:users,id'],
            'scheduled_start' => ['nullable', 'date'],
            'scheduled_end' => ['nullable', 'date', 'after_or_equal:scheduled_start'],
            'site_address' => ['nullable', 'string'],
            'site_contact_name' => ['nullable', 'string', 'max:120'],
            'site_contact_phone' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => ['integer', 'exists:users,id'],
        ];
    }
}
