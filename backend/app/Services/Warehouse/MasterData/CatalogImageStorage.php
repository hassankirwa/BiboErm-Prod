<?php

namespace App\Services\Warehouse\MasterData;

use App\Support\BiboStorage;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CatalogImageStorage
{
    public const CATEGORY = 'warehouse-catalog';

    public const EXTRACT_OWNER_PREFIX = 'extract-';

    /** Downscale/compress when source exceeds this many bytes. */
    public const COMPRESS_THRESHOLD_BYTES = 400_000;

    /** Max longest edge after downscale. */
    public const MAX_EDGE_PX = 1600;

    /**
     * @return array{path: string, url: string|null}|null
     */
    public function storeDataUrl(string $dataUrl, string $sku, string $catalogTier): ?array
    {
        if (! preg_match('#^data:([^;]+);base64,(.+)$#', $dataUrl, $matches)) {
            return null;
        }

        $contents = base64_decode($matches[2], true);
        if (! is_string($contents) || $contents === '') {
            return null;
        }

        return $this->storeBinary($contents, $matches[1], $sku, $catalogTier);
    }

    /**
     * Permanent catalog image under public/warehouse-catalog/{tier}/…
     *
     * @return array{path: string, url: string|null}|null
     */
    public function storeBinary(string $contents, string $mimeType, string $sku, string $catalogTier): ?array
    {
        return $this->writeBinary($contents, $mimeType, $sku, Str::slug($catalogTier, '-') ?: 'general');
    }

    /**
     * Temporary extract image under public/warehouse-catalog/extract-{token}/…
     * (same URL shape as permanent files; cleaned up on import/discard).
     *
     * @return array{path: string, url: string|null}|null
     */
    public function storeExtractBinary(
        string $contents,
        string $mimeType,
        string $sku,
        string $extractToken,
    ): ?array {
        $owner = $this->extractOwnerSegment($extractToken);
        if ($owner === null) {
            return null;
        }

        return $this->writeBinary($contents, $mimeType, $sku, $owner);
    }

    /**
     * @return array{path: string, url: string|null}|null
     */
    public function storeExtractDataUrl(string $dataUrl, string $sku, string $extractToken): ?array
    {
        if (! preg_match('#^data:([^;]+);base64,(.+)$#', $dataUrl, $matches)) {
            return null;
        }

        $contents = base64_decode($matches[2], true);
        if (! is_string($contents) || $contents === '') {
            return null;
        }

        return $this->storeExtractBinary($contents, $matches[1], $sku, $extractToken);
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
     * Move/copy a temp extract image into the permanent tier folder.
     *
     * @return array{path: string, url: string|null}|null
     */
    public function promoteExtractPath(?string $relativePath, string $sku, string $catalogTier): ?array
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

        $extension = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION)) ?: 'jpg';
        $mimeType = match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'bmp' => 'image/bmp',
            default => 'image/png',
        };

        $stored = $this->storeBinary($contents, $mimeType, $sku, $catalogTier);
        if ($stored !== null && ($stored['path'] ?? null) !== $relativePath) {
            $disk->delete($relativePath);
        }

        return $stored;
    }

    public function cleanupExtractToken(string $extractToken): void
    {
        $owner = $this->extractOwnerSegment($extractToken);
        if ($owner === null) {
            return;
        }

        $disk = Storage::disk(BiboStorage::diskName());
        $directory = 'public/'.self::CATEGORY.'/'.$owner;
        if ($disk->exists($directory)) {
            $disk->deleteDirectory($directory);
        }
    }

    /**
     * @return array{deleted_tokens: int, deleted_files: int}
     */
    public function cleanupStaleExtracts(int $olderThanHours = 24): array
    {
        $disk = Storage::disk(BiboStorage::diskName());
        $root = 'public/'.self::CATEGORY;
        $deletedTokens = 0;
        $deletedFiles = 0;
        $cutoff = now()->subHours(max(1, $olderThanHours))->getTimestamp();

        if (! $disk->exists($root)) {
            return ['deleted_tokens' => 0, 'deleted_files' => 0];
        }

        foreach ($disk->directories($root) as $directory) {
            $owner = basename($directory);
            if (! str_starts_with($owner, self::EXTRACT_OWNER_PREFIX)) {
                continue;
            }

            $newest = 0;
            foreach ($disk->allFiles($directory) as $file) {
                $newest = max($newest, (int) $disk->lastModified($file));
            }

            if ($newest > 0 && $newest > $cutoff) {
                continue;
            }

            $deletedFiles += count($disk->allFiles($directory));
            $disk->deleteDirectory($directory);
            $deletedTokens++;
        }

        return [
            'deleted_tokens' => $deletedTokens,
            'deleted_files' => $deletedFiles,
        ];
    }

    public function delete(?string $relativePath): void
    {
        if (! $relativePath) {
            return;
        }

        $disk = Storage::disk(BiboStorage::diskName());
        if ($disk->exists($relativePath)) {
            $disk->delete($relativePath);
        }
    }

    protected function extractOwnerSegment(string $extractToken): ?string
    {
        $token = trim($extractToken);
        if ($token === '' || ! preg_match('/^[A-Za-z0-9_-]{8,80}$/', $token)) {
            return null;
        }

        return self::EXTRACT_OWNER_PREFIX.Str::slug($token, '-');
    }

    /**
     * @return array{path: string, url: string|null}|null
     */
    protected function writeBinary(string $contents, string $mimeType, string $sku, string $ownerSegment): ?array
    {
        if ($contents === '') {
            return null;
        }

        [$contents, $mimeType] = $this->maybeCompress($contents, $mimeType);

        $extension = match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/bmp' => 'bmp',
            default => 'png',
        };

        $safeSku = Str::slug($sku, '-') ?: 'catalog-image';
        $contentHash = substr(hash('sha256', $contents), 0, 20);
        $filename = strtolower($safeSku).'-'.$contentHash.'.'.$extension;
        $relativePath = 'public/'.self::CATEGORY.'/'.$ownerSegment.'/'.$filename;

        $disk = Storage::disk(BiboStorage::diskName());
        if (! $disk->exists($relativePath)) {
            $disk->put($relativePath, $contents);
        }

        return [
            'path' => $relativePath,
            'url' => BiboStorage::publicUrlPrefix().'/'.self::CATEGORY.'/'.$ownerSegment.'/'.$filename,
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    protected function maybeCompress(string $contents, string $mimeType): array
    {
        if (strlen($contents) < self::COMPRESS_THRESHOLD_BYTES) {
            return [$contents, $mimeType];
        }

        if (! extension_loaded('gd') || ! function_exists('imagecreatefromstring')) {
            return [$contents, $mimeType];
        }

        $image = @imagecreatefromstring($contents);
        if ($image === false) {
            return [$contents, $mimeType];
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width < 1 || $height < 1) {
            imagedestroy($image);

            return [$contents, $mimeType];
        }

        $maxEdge = max($width, $height);
        if ($maxEdge > self::MAX_EDGE_PX) {
            $scale = self::MAX_EDGE_PX / $maxEdge;
            $newWidth = max(1, (int) round($width * $scale));
            $newHeight = max(1, (int) round($height * $scale));
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            if ($resized === false) {
                imagedestroy($image);

                return [$contents, $mimeType];
            }

            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
            imagefilledrectangle($resized, 0, 0, $newWidth, $newHeight, $transparent);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }

        ob_start();
        imagejpeg($image, null, 82);
        $compressed = ob_get_clean();
        imagedestroy($image);

        if (! is_string($compressed) || $compressed === '') {
            return [$contents, $mimeType];
        }

        return [$compressed, 'image/jpeg'];
    }
}
