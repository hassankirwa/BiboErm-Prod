<?php

namespace App\Services\Media;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AvatarStorageService
{
    /**
     * @return array{url: ?string, path: string}
     */
    public function store(UploadedFile $file, User $user): array
    {
        $disk = (string) config('bibo.avatar_disk', 'public');
        $ext = strtolower((string) ($file->getClientOriginalExtension() ?: $file->guessExtension()));
        $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'bin';
        $path = 'avatars/'.$user->id.'/'.Str::uuid()->toString().'.'.$ext;
        Storage::disk($disk)->put($path, $file->get());

        $urlMethod = Storage::disk($disk)->url($path);
        $url = is_string($urlMethod) ? $urlMethod : null;

        return ['url' => $url, 'path' => $path];
    }

    public function deleteIfExists(?string $path): void
    {
        if (! $path) {
            return;
        }

        Storage::disk((string) config('bibo.avatar_disk', 'public'))->delete($path);
    }
}
