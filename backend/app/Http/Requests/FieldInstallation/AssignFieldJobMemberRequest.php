<?php

namespace App\Http\Requests\FieldInstallation;

use Illuminate\Foundation\Http\FormRequest;

class AssignFieldJobMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role' => ['nullable', 'string', 'max:50'],
        ];
    }
}
