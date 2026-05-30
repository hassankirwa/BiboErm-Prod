<?php

namespace App\Http\Requests\Warehouse\Offcuts;

use Illuminate\Foundation\Http\FormRequest;

class AllocateOffcutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'project_id' => ['required', 'exists:projects,id'],
        ];
    }
}
