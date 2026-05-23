<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class AvatarUploadRequest extends FormRequest
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
        $maxKb = (int) config('bibo.avatar_max_kb', 2048);

        return [
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:'.$maxKb],
        ];
    }
}
