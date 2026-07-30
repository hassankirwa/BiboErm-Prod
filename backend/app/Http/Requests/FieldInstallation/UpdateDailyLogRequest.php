<?php

namespace App\Http\Requests\FieldInstallation;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDailyLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'log_date' => ['sometimes', 'date'],
            'summary' => ['sometimes', 'required', 'string'],
            'units_completed' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'percent_today' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'weather' => ['sometimes', 'nullable', 'string', 'max:80'],
            'site_conditions' => ['sometimes', 'nullable', 'string'],
            'blockers' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
