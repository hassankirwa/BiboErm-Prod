<?php

namespace App\Services\Media;

use App\Support\BiboStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FileStorageService
{
    private const BLOCKED_EXTENSIONS = [
        'php', 'phtml', 'phar', 'php3', 'php4', 'php5', 'php7', 'php8',
        'exe', 'sh', 'bat', 'cmd', 'com', 'dll', 'js', 'html', 'htm', 'svg',
    ];

    public function __construct(
        private readonly FileUploadValidator $validator,
        private readonly ImageSanitizer $sanitizer,
    ) {}

    /**
     * Validate, sanitize, rename, and store an upload.
     *
     * @return array{path: string, url: string|null, filename: string, disk: string, category: string, public: bool}
     */
    public function store(UploadedFile $file, string $category, ?string $ownerSegment = null): array
    {
        $this->guardAgainstDangerousOriginalName($file);
        $this->validator->validate($file, $category);

        $disk = BiboStorage::diskName();
        $extension = $this->validator->resolveExtension($file, $category);
        $filename = $this->generateFilename($category, $ownerSegment, $extension);
        $visibility = BiboStorage::isCategoryPublic($category) ? 'public' : 'private';

        $relativePath = $ownerSegment
            ? "{$visibility}/{$category}/{$ownerSegment}/{$filename}"
            : "{$visibility}/{$category}/{$filename}";

        $contents = $this->prepareContents($file, $category, $extension);

        Storage::disk($disk)->put($relativePath, $contents);

        $url = $visibility === 'public'
            ? BiboStorage::publicUrlPrefix()."/{$category}/{$ownerSegment}/{$filename}"
            : BiboStorage::resolvePrivateApiUrl($relativePath);

        return [
            'path' => $relativePath,
            'url' => $url,
            'filename' => $filename,
            'disk' => $disk,
            'category' => $category,
            'public' => $visibility === 'public',
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

            return;
        }

        // Legacy paths stored before public/ prefix.
        if (str_starts_with($relativePath, 'profiles/') && $disk->exists('public/'.$relativePath)) {
            $disk->delete('public/'.$relativePath);
        }
    }

    private function prepareContents(UploadedFile $file, string $category, string $extension): string
    {
        $imageOnly = (bool) config("bibo.storage.categories.{$category}.image_only", false);

        if ($imageOnly) {
            return $this->sanitizer->sanitize($file, $extension);
        }

        return (string) file_get_contents($file->getRealPath() ?: $file->getPathname());
    }

    private function guardAgainstDangerousOriginalName(UploadedFile $file): void
    {
        $original = strtolower($file->getClientOriginalName());
        $extension = strtolower((string) pathinfo($original, PATHINFO_EXTENSION));

        if (in_array($extension, self::BLOCKED_EXTENSIONS, true)) {
            throw ValidationException::withMessages([
                'file' => [__('This file type is not allowed.')],
            ]);
        }

        if (preg_match('/\.(php|phtml|phar|exe|sh|bat|cmd|js|html|htm)(\.|$)/i', $original)) {
            throw ValidationException::withMessages([
                'file' => [__('This file type is not allowed.')],
            ]);
        }
    }

    private function generateFilename(string $category, ?string $ownerSegment, string $extension): string
    {
        $prefix = Str::slug(Str::singular($category), '-');
        $owner = $ownerSegment ? 'u'.preg_replace('/[^a-zA-Z0-9_-]/', '', $ownerSegment) : 'shared';
        $unique = strtolower(str_replace('-', '', (string) Str::ulid()));

        return "{$prefix}-{$owner}-{$unique}.{$extension}";
    }
}
