<?php

namespace App\Services\Media;

use App\Models\User;
use Illuminate\Http\UploadedFile;

/**
 * Profile avatar uploads — stored under storage/public/profiles/{user_id}/
 */
class AvatarStorageService
{
    public function __construct(
        private readonly FileStorageService $files,
    ) {}

    /**
     * @return array{path: string, url: string|null, filename: string, disk: string, category: string}
     */
    public function store(UploadedFile $file, User $user): array
    {
        return $this->files->store($file, 'profiles', (string) $user->id);
    }

    public function deleteIfExists(?string $path): void
    {
        $this->files->delete($path);
    }
}
