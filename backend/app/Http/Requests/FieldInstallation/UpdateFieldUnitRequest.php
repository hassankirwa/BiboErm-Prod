<?php

namespace App\Http\Requests\FieldInstallation;

use App\Enums\FieldInstallation\FieldUnitStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFieldUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(FieldUnitStatus::class)],
            'snag_notes' => ['nullable', 'string'],
            'misfit_notes' => ['nullable', 'string'],
        ];
    }
}
