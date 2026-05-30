<?php

namespace App\Http\Requests\Warehouse\MasterData;

use Illuminate\Foundation\Http\FormRequest;

class StoreDoorTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:20', 'unique:door_types,code'],
            'name' => ['required', 'string', 'max:255'],
            'section_code' => ['required', 'string', 'max:30'],
        ];
    }
}
