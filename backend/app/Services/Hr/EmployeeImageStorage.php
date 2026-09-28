<?php

namespace App\Services\Hr;

use App\Support\BiboStorage;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmployeeImageStorage
{
    public const CATEGORY = 'hr-employees';

    public const EXTRACT_OWNER_PREFIX = 'extract-';

    /**
     * @return array{path: string, url: string|null}|null
     */
    public function storeExtractBinary(string $contents, string $mimeType, string $staffNo, string $extractToken): ?array
    {
        $owner = $this->extractOwnerSegment($extractToken);
        if ($owner === null || $contents === '') {
            return null;
        }

        $ext = match (strtolower($mimeType)) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/bmp' => 'bmp',
            default => 'png',
        };

        $safe = Str::slug($staffNo, '-') ?: 'staff';
        $path = 'public/'.self::CATEGORY.'/'.$owner.'/'.$safe.'-'.Str::lower(Str::random(8)).'.'.$ext;
        Storage::disk(BiboStorage::diskName())->put($path, $contents);

        return [
            'path' => $path,
            'url' => BiboStorage::resolveStoredUrl($path),
        ];
    }

    public function isExtractPath(?string $relativePath): bool
    {
        if ($relativePath === null || $relativePath === '') {
            return false;
        }

        $normalized = ltrim(str_replace('\\', '/', $relativePath), '/');

        return (bool) preg_match(
            '#^public/'.preg_quote(self::CATEGORY, '#').'/'.preg_quote(self::EXTRACT_OWNER_PREFIX, '#').'[^/]+/#',
            $normalized,
        );
    }

    /**
     * @return array{path: string, url: string|null}|null
     */
    public function promoteExtractPath(?string $relativePath, string $staffNo): ?array
    {
        if ($relativePath === null || $relativePath === '') {
            return null;
        }

        if (! $this->isExtractPath($relativePath)) {
            return [
                'path' => $relativePath,
                'url' => BiboStorage::resolveStoredUrl($relativePath),
            ];
        }

        $disk = Storage::disk(BiboStorage::diskName());
        if (! $disk->exists($relativePath)) {
            return null;
        }

        $contents = $disk->get($relativePath);
        if (! is_string($contents) || $contents === '') {
            return null;
        }

        $ext = pathinfo($relativePath, PATHINFO_EXTENSION) ?: 'jpg';
        $safe = Str::slug($staffNo, '-') ?: 'staff';
        $path = 'public/'.self::CATEGORY.'/profiles/'.$safe.'-'.Str::lower(Str::random(8)).'.'.$ext;
        $disk->put($path, $contents);

        return [
            'path' => $path,
            'url' => BiboStorage::resolveStoredUrl($path),
        ];
    }

    public function cleanupExtractToken(string $extractToken): void
    {
        $owner = $this->extractOwnerSegment($extractToken);
        if ($owner === null) {
            return;
        }

        $disk = Storage::disk(BiboStorage::diskName());
        $folder = 'public/'.self::CATEGORY.'/'.$owner;
        if ($disk->exists($folder)) {
            $disk->deleteDirectory($folder);
        }
    }

    private function extractOwnerSegment(string $extractToken): ?string
    {
        $token = trim($extractToken);
        if ($token === '' || ! preg_match('/^[A-Za-z0-9\-_]{8,80}$/', $token)) {
            return null;
        }

        return self::EXTRACT_OWNER_PREFIX.$token;
    }
}
