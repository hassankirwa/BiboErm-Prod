<?php

namespace App\Services\Media;

use App\Models\User;
use App\Support\BiboStorage;

final class StoredFileAccessService
{
    public function canAccess(User $user, string $relativePath): bool
    {
        $relativePath = $this->normalizeRelativePath($relativePath);

        if ($relativePath === '' || str_contains($relativePath, '..')) {
            return false;
        }

        if (str_starts_with($relativePath, 'public/')) {
            return true;
        }

        if (! str_starts_with($relativePath, 'private/')) {
            return false;
        }

        $parsed = BiboStorage::parseStoredPath($relativePath);

        if ($parsed === null) {
            return false;
        }

        if ((string) $user->id === $parsed['owner']) {
            return true;
        }

        /** @var list<string> $permissions */
        $permissions = config("bibo.storage.categories.{$parsed['category']}.permissions", []);

        if ($permissions === []) {
            return false;
        }

        foreach ($permissions as $permission) {
            if ($user->can($permission)) {
                return true;
            }
        }

        return false;
    }

    private function normalizeRelativePath(string $path): string
    {
        return ltrim(str_replace('\\', '/', $path), '/');
    }
}
