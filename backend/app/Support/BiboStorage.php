<?php

namespace App\Support;

use Illuminate\Support\Str;

final class BiboStorage
{
    public static function rootPath(): string
    {
        $configured = config('bibo.storage.path');

        if (is_string($configured) && $configured !== '') {
            $path = self::normalizePath($configured);
        } else {
            $path = self::normalizePath(dirname(base_path()).DIRECTORY_SEPARATOR.'storage');
        }

        $resolved = realpath($path);

        return $resolved !== false ? $resolved : $path;
    }

    public static function publicRootPath(): string
    {
        return self::rootPath().DIRECTORY_SEPARATOR.'public';
    }

    public static function diskName(): string
    {
        return (string) config('bibo.storage.disk', 'bibo');
    }

    public static function publicUrlPrefix(): string
    {
        $configured = config('bibo.storage.url');

        if (is_string($configured) && $configured !== '') {
            return rtrim($configured, '/');
        }

        return rtrim((string) config('app.url'), '/').'/media';
    }

    /**
     * @return list<string>
     */
    public static function categories(): array
    {
        /** @var array<string, mixed> $categories */
        $categories = config('bibo.storage.categories', []);

        return array_keys($categories);
    }

    public static function isCategoryPublic(string $category): bool
    {
        return (bool) config("bibo.storage.categories.{$category}.public", false);
    }

    /**
     * @return array{visibility: string, category: string, owner: string, filename: string}|null
     */
    public static function parseStoredPath(string $path): ?array
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');

        if (str_contains($path, '..')) {
            return null;
        }

        $parts = explode('/', $path);

        if (count($parts) === 4 && in_array($parts[0], ['public', 'private'], true)) {
            return [
                'visibility' => $parts[0],
                'category' => $parts[1],
                'owner' => $parts[2],
                'filename' => $parts[3],
            ];
        }

        // Legacy: profiles/{owner}/{filename}
        if (count($parts) === 3 && $parts[0] === 'profiles') {
            return [
                'visibility' => 'public',
                'category' => $parts[0],
                'owner' => $parts[1],
                'filename' => $parts[2],
            ];
        }

        return null;
    }

    public static function resolvePublicUrl(string $relativePath): ?string
    {
        $parsed = self::parseStoredPath($relativePath);

        if ($parsed === null) {
            return null;
        }

        if ($parsed['visibility'] !== 'public') {
            return null;
        }

        return self::publicUrlPrefix()."/{$parsed['category']}/{$parsed['owner']}/{$parsed['filename']}";
    }

    public static function resolvePrivateApiUrl(string $relativePath): ?string
    {
        $parsed = self::parseStoredPath($relativePath);

        if ($parsed === null || $parsed['visibility'] !== 'private') {
            return null;
        }

        return rtrim((string) config('app.url'), '/')
            ."/api/files/{$parsed['category']}/{$parsed['owner']}/{$parsed['filename']}";
    }

    public static function ensureCategoryDirectoriesExist(): void
    {
        $root = self::rootPath();

        self::migrateMisplacedBackendPublic($root);

        foreach ([$root, self::publicRootPath(), $root.DIRECTORY_SEPARATOR.'private'] as $dir) {
            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }

        foreach (self::categories() as $category) {
            $visibility = self::isCategoryPublic($category) ? 'public' : 'private';
            $dir = $root.DIRECTORY_SEPARATOR.$visibility.DIRECTORY_SEPARATOR.$category;

            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            if ($visibility === 'public') {
                self::migrateLegacyPublicCategory($root, $category);
            } else {
                self::migrateLegacyPrivateCategory($root, $category);
            }
        }
    }

    private static function migrateLegacyPrivateCategory(string $root, string $category): void
    {
        $legacy = $root.DIRECTORY_SEPARATOR.$category;
        $target = $root.DIRECTORY_SEPARATOR.'private'.DIRECTORY_SEPARATOR.$category;

        if (! is_dir($legacy) || realpath($legacy) === realpath($target)) {
            return;
        }

        foreach (scandir($legacy) ?: [] as $entry) {
            if (in_array($entry, ['.', '..', '.gitkeep'], true)) {
                continue;
            }

            $from = $legacy.DIRECTORY_SEPARATOR.$entry;
            $to = $target.DIRECTORY_SEPARATOR.$entry;

            if (file_exists($to)) {
                continue;
            }

            rename($from, $to);
        }
    }

    /**
     * Files written before the bibo disk root was normalized may live under backend/storage/public/.
     */
    private static function migrateMisplacedBackendPublic(string $root): void
    {
        $legacyPublic = base_path('storage'.DIRECTORY_SEPARATOR.'public');
        $targetPublic = self::publicRootPath();

        if (! is_dir($legacyPublic)) {
            return;
        }

        $legacyReal = realpath($legacyPublic);
        $targetReal = realpath($targetPublic) ?: $targetPublic;

        if ($legacyReal !== false && $legacyReal === $targetReal) {
            return;
        }

        self::mergeDirectoryInto($legacyPublic, $targetPublic);
    }

    private static function mergeDirectoryInto(string $from, string $to): void
    {
        if (! is_dir($to)) {
            mkdir($to, 0755, true);
        }

        foreach (scandir($from) ?: [] as $entry) {
            if (in_array($entry, ['.', '..', '.gitkeep'], true)) {
                continue;
            }

            $fromPath = $from.DIRECTORY_SEPARATOR.$entry;
            $toPath = $to.DIRECTORY_SEPARATOR.$entry;

            if (is_dir($fromPath)) {
                self::mergeDirectoryInto($fromPath, $toPath);

                if (count(scandir($fromPath) ?: []) <= 2) {
                    @rmdir($fromPath);
                }

                continue;
            }

            if (! file_exists($toPath)) {
                rename($fromPath, $toPath);
            }
        }
    }

    private static function migrateLegacyPublicCategory(string $root, string $category): void
    {
        $legacy = $root.DIRECTORY_SEPARATOR.$category;
        $target = $root.DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR.$category;

        if (! is_dir($legacy) || realpath($legacy) === realpath($target)) {
            return;
        }

        foreach (scandir($legacy) ?: [] as $entry) {
            if (in_array($entry, ['.', '..', '.gitkeep'], true)) {
                continue;
            }

            $from = $legacy.DIRECTORY_SEPARATOR.$entry;
            $to = $target.DIRECTORY_SEPARATOR.$entry;

            if (file_exists($to)) {
                continue;
            }

            rename($from, $to);
        }
    }

    public static function normalizePath(string $path): string
    {
        if (Str::startsWith($path, ['/', '\\']) || preg_match('/^[A-Za-z]:[\\\\\\/]/', $path)) {
            return str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
        }

        return str_replace(['/', '\\'], DIRECTORY_SEPARATOR, base_path($path));
    }
}
