<?php

namespace App\Http\Requests\Production;

use App\Enums\Production\ProductionStage;
use App\Enums\Production\TeamRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignProductionTeamRequest extends FormRequest
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
            'stage' => ['required', 'string', Rule::enum(ProductionStage::class)],
            'role' => ['required', 'string', Rule::enum(TeamRole::class)],
            'notes' => ['nullable', 'string'],
        ];
    }
}
