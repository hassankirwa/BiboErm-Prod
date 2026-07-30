<?php

namespace App\Http\Requests\Production;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCuttingSheetLineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'cut_length_mm' => ['sometimes', 'integer', 'min:1'],
            'pieces' => ['sometimes', 'integer', 'min:1'],
            'bar_length_mm' => ['nullable', 'integer', 'min:1'],
            'waste_mm' => ['nullable', 'integer', 'min:0'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
