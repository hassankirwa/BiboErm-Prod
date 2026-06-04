<?php

namespace App\Http\Requests\FieldInstallation;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFieldJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'team_lead_id' => ['sometimes', 'integer', 'exists:users,id'],
            'scheduled_start' => ['sometimes', 'nullable', 'date'],
            'scheduled_end' => ['sometimes', 'nullable', 'date'],
            'site_address' => ['sometimes', 'nullable', 'string'],
            'site_contact_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'site_contact_phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
