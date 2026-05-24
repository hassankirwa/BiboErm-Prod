<?php

namespace App\Http\Requests\Profile;

use App\Services\Media\FileUploadValidator;
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
        return app(FileUploadValidator::class)->rulesForCategory('profiles', 'avatar');
    }
}
