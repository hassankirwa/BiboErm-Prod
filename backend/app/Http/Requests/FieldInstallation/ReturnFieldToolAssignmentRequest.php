<?php

namespace App\Http\Requests\FieldInstallation;

use Illuminate\Foundation\Http\FormRequest;

class ReturnFieldToolAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'condition_in' => ['nullable', 'string', 'max:32'],
            'damage_notes' => ['nullable', 'string'],
        ];
    }
}
