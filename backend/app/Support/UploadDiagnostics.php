<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

/**
 * Diagnoses PHP / web-server upload rejections and builds client-safe messages.
 *
 * Laravel's generic "The POST data is too large." / "The file failed to upload."
 * hide the actual limit that fired. Logs keep the full snapshot; API payloads
 * keep a clear message plus non-sensitive limit numbers.
 */
final class UploadDiagnostics
{
    public const ERROR_POST_TOO_LARGE = 'post_too_large';

    /**
     * @return array<string, mixed>
     */
    public static function snapshot(Request $request, array $extra = []): array
    {
        $contentLength = self::contentLength($request);
        $postMax = (string) ini_get('post_max_size');
        $uploadMax = (string) ini_get('upload_max_filesize');
        $postMaxBytes = self::iniBytes($postMax);
        $uploadMaxBytes = self::iniBytes($uploadMax);
        $appMaxKb = max(1, (int) config('bibo.warehouse.material_catalog_workbook_max_kb', 153600));

        return array_filter([
            'method' => $request->method(),
            'path' => '/'.$request->path(),
            'content_length_bytes' => $contentLength > 0 ? $contentLength : null,
            'content_length' => $contentLength > 0 ? self::formatBytes($contentLength) : null,
            'post_max_size' => $postMax !== '' ? $postMax : null,
            'post_max_bytes' => $postMaxBytes > 0 ? $postMaxBytes : null,
            'upload_max_filesize' => $uploadMax !== '' ? $uploadMax : null,
            'upload_max_bytes' => $uploadMaxBytes > 0 ? $uploadMaxBytes : null,
            'memory_limit' => ini_get('memory_limit') ?: null,
            'max_input_time' => ini_get('max_input_time') ?: null,
            'app_workbook_max_kb' => $appMaxKb,
            'app_workbook_max' => self::formatBytes($appMaxKb * 1024),
            'recommended_php' => self::recommendedIni(),
            'user_id' => $request->user()?->getAuthIdentifier(),
            ...$extra,
        ], static fn (mixed $value): bool => $value !== null && $value !== '');
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    public static function logRejection(string $reason, Request $request, array $extra = []): void
    {
        Log::warning('Upload rejected: '.$reason, self::snapshot($request, $extra));
    }

    /**
     * Safe JSON body: clear client message + limit numbers for operators.
     *
     * @return array<string, mixed>
     */
    public static function clientPayload(string $message, string $error, Request $request, ?string $filename = null): array
    {
        $snapshot = self::snapshot($request, $filename ? ['filename' => $filename] : []);

        $limits = array_intersect_key($snapshot, array_flip([
            'content_length',
            'content_length_bytes',
            'post_max_size',
            'upload_max_filesize',
            'app_workbook_max',
            'recommended_php',
            'filename',
        ]));

        $payload = [
            'message' => $message,
            'error' => $error,
            'errors' => [
                'file' => [$message],
            ],
            'limits' => $limits,
        ];

        if ((bool) config('app.debug')) {
            $payload['detail'] = $message;
            $payload['exception'] = $error;
        }

        return $payload;
    }

    public static function messageForPostTooLarge(Request $request): string
    {
        $received = self::contentLength($request);
        $limit = self::iniBytes((string) ini_get('post_max_size'));
        $receivedText = $received > 0 ? self::formatBytes($received) : 'unknown size';
        $limitText = $limit > 0 ? self::formatBytes($limit) : (string) ini_get('post_max_size');

        return sprintf(
            'This workbook is larger than PHP post_max_size (request %s; server allows %s). Raise post_max_size and upload_max_filesize to at least %s, and nginx client_max_body_size if used.',
            $receivedText,
            $limitText,
            self::recommendedIni(),
        );
    }

    public static function messageForPhpError(UploadedFile $file): string
    {
        $name = trim((string) $file->getClientOriginalName());
        $label = $name !== '' ? $name : 'The file';
        $size = (int) $file->getSize();
        $sizeText = $size > 0 ? self::formatBytes($size) : 'unknown size';
        $uploadMax = self::iniBytes((string) ini_get('upload_max_filesize'));
        $uploadMaxText = $uploadMax > 0 ? self::formatBytes($uploadMax) : (string) ini_get('upload_max_filesize');
        $recommended = self::recommendedIni();

        return match ($file->getError()) {
            UPLOAD_ERR_INI_SIZE => sprintf(
                '%s exceeded PHP upload_max_filesize (file %s; limit %s). Raise upload_max_filesize and post_max_size to at least %s.',
                $label,
                $sizeText,
                $uploadMaxText,
                $recommended,
            ),
            UPLOAD_ERR_FORM_SIZE => sprintf(
                '%s exceeded the form MAX_FILE_SIZE limit. Use a smaller workbook or raise the server upload limit to %s.',
                $label,
                $recommended,
            ),
            UPLOAD_ERR_PARTIAL => sprintf(
                '%s was only partially uploaded. Retry the workbook upload.',
                $label,
            ),
            UPLOAD_ERR_NO_FILE => 'No file was received. Choose a workbook and try again.',
            UPLOAD_ERR_NO_TMP_DIR => 'The server has no PHP upload temp directory (upload_tmp_dir). Check php.ini, then retry.',
            UPLOAD_ERR_CANT_WRITE => sprintf(
                'The server could not write %s to the PHP upload temp directory. Check disk space and permissions.',
                $label,
            ),
            UPLOAD_ERR_EXTENSION => sprintf(
                'A PHP extension blocked the upload of %s. Check server logs for the extension that stopped it.',
                $label,
            ),
            default => sprintf(
                '%s failed to upload (PHP error %d). Check laravel.log for the server limits that fired.',
                $label,
                $file->getError(),
            ),
        };
    }

    public static function errorCodeName(int $error): string
    {
        return match ($error) {
            UPLOAD_ERR_INI_SIZE => 'upload_max_filesize_exceeded',
            UPLOAD_ERR_FORM_SIZE => 'form_max_file_size_exceeded',
            UPLOAD_ERR_PARTIAL => 'upload_partial',
            UPLOAD_ERR_NO_FILE => 'upload_missing_file',
            UPLOAD_ERR_NO_TMP_DIR => 'upload_tmp_dir_missing',
            UPLOAD_ERR_CANT_WRITE => 'upload_cant_write',
            UPLOAD_ERR_EXTENSION => 'upload_blocked_by_extension',
            default => 'upload_failed',
        };
    }

    /**
     * @return list<UploadedFile>
     */
    public static function failedFiles(Request $request): array
    {
        $failed = [];

        foreach (self::flattenFiles($request->allFiles()) as $file) {
            if ($file instanceof UploadedFile && $file->getError() !== UPLOAD_ERR_OK) {
                $failed[] = $file;
            }
        }

        return $failed;
    }

    public static function recommendedIni(): string
    {
        $kb = max(1, (int) config('bibo.warehouse.material_catalog_workbook_max_kb', 153600));

        return ((int) ceil($kb / 1024) + 10).'M';
    }

    public static function contentLength(Request $request): int
    {
        $header = $request->server('CONTENT_LENGTH', $request->header('Content-Length', 0));

        return max(0, (int) $header);
    }

    public static function iniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '' || $value === '-1') {
            return 0;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        $metric = strtoupper(substr($value, -1));
        $number = (int) $value;

        return match ($metric) {
            'K' => $number * 1024,
            'M' => $number * 1024 * 1024,
            'G' => $number * 1024 * 1024 * 1024,
            default => $number,
        };
    }

    public static function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / (1024 * 1024), 1).' MB';
    }

    /**
     * @param  array<int|string, mixed>  $files
     * @return list<UploadedFile>
     */
    protected static function flattenFiles(array $files): array
    {
        $flat = [];

        foreach ($files as $file) {
            if ($file instanceof UploadedFile) {
                $flat[] = $file;

                continue;
            }

            if (is_array($file)) {
                foreach (self::flattenFiles($file) as $nested) {
                    $flat[] = $nested;
                }
            }
        }

        return $flat;
    }
}
