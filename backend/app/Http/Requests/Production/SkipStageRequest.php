<?php

namespace App\Http\Requests\Production;

use App\Enums\Production\ProductionStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SkipStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'stage' => ['required', 'string', Rule::in([ProductionStage::GlassAssembly->value])],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function stage(): ProductionStage
    {
        return ProductionStage::from($this->validated('stage'));
    }
}
