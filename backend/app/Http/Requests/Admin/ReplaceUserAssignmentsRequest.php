<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReplaceUserAssignmentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'additional_assignments' => ['nullable', 'array'],
            'additional_assignments.*.department_id' => ['required', 'integer', 'exists:departments,id'],
            'additional_assignments.*.role_id' => ['required', 'integer', 'exists:roles,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('additional_assignments') || ! is_array($this->additional_assignments)) {
            $this->merge(['additional_assignments' => []]);
        }
    }
}
