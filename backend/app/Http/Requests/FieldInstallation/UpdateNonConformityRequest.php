<?php

namespace App\Http\Requests\FieldInstallation;

use App\Enums\FieldInstallation\NonConformityStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNonConformityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(NonConformityStatus::class)],
            'resolution_notes' => ['nullable', 'string'],
        ];
    }
}
