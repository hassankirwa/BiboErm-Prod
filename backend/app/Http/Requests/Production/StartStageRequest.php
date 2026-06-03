<?php

namespace App\Http\Requests\Production;

use App\Enums\Production\ProductionStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'stage' => ['required', 'string', Rule::enum(ProductionStage::class)],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function stage(): ProductionStage
    {
        return ProductionStage::from($this->validated('stage'));
    }
}
