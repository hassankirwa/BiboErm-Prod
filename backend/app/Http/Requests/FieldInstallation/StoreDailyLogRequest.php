<?php

namespace App\Http\Requests\FieldInstallation;

use Illuminate\Foundation\Http\FormRequest;

class StoreDailyLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'log_date' => ['nullable', 'date'],
            'summary' => ['required', 'string'],
            'units_completed' => ['nullable', 'integer', 'min:0'],
            'percent_today' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'weather' => ['nullable', 'string', 'max:80'],
            'site_conditions' => ['nullable', 'string'],
            'blockers' => ['nullable', 'string'],
        ];
    }
}
