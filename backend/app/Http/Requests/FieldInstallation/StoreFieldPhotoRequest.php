<?php

namespace App\Http\Requests\FieldInstallation;

use App\Enums\FieldInstallation\FieldPhotoAttachableType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFieldPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'job_id' => ['required', 'integer', 'exists:field_installation_jobs,id'],
            'attachable_type' => ['required', Rule::enum(FieldPhotoAttachableType::class)],
            'attachable_id' => ['required', 'integer', 'min:1'],
            'file' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp'],
            'caption' => ['nullable', 'string'],
            'taken_at' => ['nullable', 'date'],
            'firebase_url' => ['nullable', 'string', 'max:500'],
        ];
    }
}
