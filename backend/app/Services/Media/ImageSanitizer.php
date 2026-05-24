<?php

namespace App\Services\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Re-encodes images to strip EXIF/metadata and embedded payloads.
 */
final class ImageSanitizer
{
    public function sanitize(UploadedFile $file, string $extension): string
    {
        $sourcePath = $file->getRealPath() ?: $file->getPathname();

        if (! function_exists('imagecreatefromstring')) {
            return (string) file_get_contents($sourcePath);
        }

        $contents = file_get_contents($sourcePath);

        if ($contents === false) {
            throw ValidationException::withMessages([
                'file' => [__('Unable to read uploaded image.')],
            ]);
        }

        $image = @imagecreatefromstring($contents);

        if ($image === false) {
            throw ValidationException::withMessages([
                'file' => [__('The uploaded file is not a valid image.')],
            ]);
        }

        ob_start();

        try {
            $written = match ($extension) {
                'jpg', 'jpeg' => imagejpeg($image, null, 85),
                'png' => imagepng($image, null, 6),
                'webp' => function_exists('imagewebp') ? imagewebp($image, null, 85) : false,
                default => false,
            };
        } finally {
            imagedestroy($image);
        }

        $output = ob_get_clean();

        if ($written === false || $output === false || $output === '') {
            Log::warning('Image sanitization failed; storing original bytes.', [
                'extension' => $extension,
            ]);

            return $contents;
        }

        return $output;
    }
}
