<?php

namespace App\Services\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class FileUploadValidator
{
    /**
     * @return array<string, mixed>
     */
    public function rulesForCategory(string $category, string $field = 'file'): array
    {
        $config = $this->categoryConfig($category);

        $rules = ['required', 'file', 'max:'.$config['max_kb']];

        if ($config['image_only']) {
            $rules[] = 'image';
        }

        $rules[] = 'mimes:'.implode(',', $config['mimes']);

        return [$field => $rules];
    }

    public function validate(UploadedFile $file, string $category): void
    {
        $config = $this->categoryConfig($category);
        $maxBytes = $config['max_kb'] * 1024;

        if ($file->getSize() > $maxBytes) {
            throw ValidationException::withMessages([
                'file' => [__('File exceeds the maximum size of :size KB.', ['size' => $config['max_kb']])],
            ]);
        }

        $extension = $this->resolveExtension($file, $category);

        if ($config['image_only'] && ! $this->isValidImage($file)) {
            throw ValidationException::withMessages([
                'file' => [__('The uploaded file is not a valid image.')],
            ]);
        }

        $this->assertImageDimensions($file, $category);

        if ($file->getClientOriginalExtension() !== '' && ! in_array(strtolower($file->getClientOriginalExtension()), $config['mimes'], true)) {
            throw ValidationException::withMessages([
                'file' => [__('This file type is not allowed.')],
            ]);
        }

        // Ensure resolved extension matches allowed set (mime-based, not client-provided).
        if (! in_array($extension, $config['mimes'], true)) {
            throw ValidationException::withMessages([
                'file' => [__('This file type is not allowed.')],
            ]);
        }
    }

    public function resolveExtension(UploadedFile $file, string $category): string
    {
        $config = $this->categoryConfig($category);

        $mime = $file->getMimeType() ?? '';

        $fromMime = match ($mime) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'application/pdf' => 'pdf',
            'text/plain' => 'txt',
            'text/csv', 'application/csv', 'text/comma-separated-values' => 'csv',
            'application/json' => 'json',
            'application/vnd.ms-excel' => 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
            'application/vnd.ms-excel.sheet.macroEnabled.12' => 'xls',
            default => null,
        };

        if ($fromMime && in_array($fromMime, $config['mimes'], true)) {
            return $fromMime;
        }

        $guessed = strtolower((string) $file->guessExtension());
        $guessed = preg_replace('/[^a-z0-9]/', '', $guessed) ?: '';

        if ($guessed !== '' && in_array($guessed, $config['mimes'], true)) {
            return $guessed;
        }

        $clientExtension = strtolower((string) $file->getClientOriginalExtension());
        $clientExtension = preg_replace('/[^a-z0-9]/', '', $clientExtension) ?: '';

        if ($clientExtension !== '' && in_array($clientExtension, $config['mimes'], true)) {
            return $clientExtension;
        }

        throw ValidationException::withMessages([
            'file' => [__('Unable to determine a safe file type for this upload.')],
        ]);
    }

    /**
     * @return array{max_kb: int, mimes: list<string>, image_only: bool, max_width: int, max_height: int}
     */
    private function categoryConfig(string $category): array
    {
        /** @var array<string, mixed>|null $config */
        $config = config("bibo.storage.categories.{$category}");

        if (! is_array($config)) {
            throw ValidationException::withMessages([
                'file' => [__('Unknown upload category.')],
            ]);
        }

        return [
            'max_kb' => (int) ($config['max_kb'] ?? 2048),
            'mimes' => array_values(array_map('strtolower', $config['mimes'] ?? [])),
            'image_only' => (bool) ($config['image_only'] ?? false),
            'max_width' => (int) ($config['max_width'] ?? 4096),
            'max_height' => (int) ($config['max_height'] ?? 4096),
        ];
    }

    private function assertImageDimensions(UploadedFile $file, string $category): void
    {
        $config = $this->categoryConfig($category);

        if (! $config['image_only']) {
            return;
        }

        $info = @getimagesize($file->getRealPath() ?: $file->getPathname());

        if ($info === false) {
            throw ValidationException::withMessages([
                'file' => [__('The uploaded file is not a valid image.')],
            ]);
        }

        [$width, $height] = $info;

        if ($width > $config['max_width'] || $height > $config['max_height']) {
            throw ValidationException::withMessages([
                'file' => [__('Image dimensions exceed the allowed maximum.')],
            ]);
        }
    }

    private function isValidImage(UploadedFile $file): bool
    {
        if (@getimagesize($file->getRealPath() ?: $file->getPathname()) === false) {
            return false;
        }

        return true;
    }
}
