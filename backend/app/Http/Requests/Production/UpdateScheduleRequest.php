<?php

namespace App\Http\Requests\Production;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'scheduled_start' => ['nullable', 'date'],
            'scheduled_end' => ['nullable', 'date', 'after_or_equal:scheduled_start'],
            'fifo_position' => ['prohibited'],
        ];
    }
}
