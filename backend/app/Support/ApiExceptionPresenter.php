<?php

namespace App\Support;

use App\Exceptions\UploadRejectedException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;
use ValueError;

/**
 * Builds clear, client-safe JSON error payloads for API requests.
 * Production responses never include stack traces, SQL bindings, or file paths.
 */
final class ApiExceptionPresenter
{
    /**
     * @return array{status: int, payload: array<string, mixed>}|null
     */
    public static function present(Throwable $e, Request $request): ?array
    {
        if (! self::wantsApiJson($request)) {
            return null;
        }

        if ($e instanceof PostTooLargeException) {
            $message = UploadDiagnostics::messageForPostTooLarge($request);
            UploadDiagnostics::logRejection(UploadDiagnostics::ERROR_POST_TOO_LARGE, $request);

            return [
                'status' => 413,
                'payload' => UploadDiagnostics::clientPayload(
                    $message,
                    UploadDiagnostics::ERROR_POST_TOO_LARGE,
                    $request,
                ),
            ];
        }

        if ($e instanceof UploadRejectedException) {
            return [
                'status' => $e->getStatusCode(),
                'payload' => $e->payload,
            ];
        }

        // Laravel already renders these correctly for API clients.
        if ($e instanceof ValidationException
            || $e instanceof AuthenticationException
            || $e instanceof AuthorizationException
            || $e instanceof ModelNotFoundException
            || $e instanceof HttpExceptionInterface
        ) {
            return null;
        }

        $debug = (bool) config('app.debug');
        $status = 500;
        [$code, $message] = self::classify($e);

        $payload = [
            'message' => $message,
            'error' => $code,
        ];

        if ($debug) {
            $payload['exception'] = $e::class;
            $payload['detail'] = self::sanitizeDetail($e->getMessage());
        }

        return ['status' => $status, 'payload' => $payload];
    }

    public static function toResponse(Throwable $e, Request $request): ?JsonResponse
    {
        $presented = self::present($e, $request);

        if ($presented === null) {
            return null;
        }

        return response()->json($presented['payload'], $presented['status']);
    }

    public static function wantsApiJson(Request $request): bool
    {
        return $request->is('api/*')
            || $request->expectsJson()
            || $request->header('X-Requested-With') === 'XMLHttpRequest';
    }

    /**
     * @return array{0: string, 1: string}
     */
    protected static function classify(Throwable $e): array
    {
        if ($e instanceof QueryException) {
            $sqlState = (string) ($e->errorInfo[0] ?? '');
            $driverCode = (string) ($e->errorInfo[1] ?? '');
            $raw = strtolower($e->getMessage());

            if (str_contains($raw, 'unknown column')
                || str_contains($raw, 'no such column')
                || $sqlState === '42S22'
                || $driverCode === '1054'
            ) {
                return [
                    'schema_outdated',
                    'Database schema is out of date. Run migrations on the server, then retry.',
                ];
            }

            if (str_contains($raw, 'base table or view not found')
                || str_contains($raw, 'no such table')
                || $sqlState === '42S02'
                || $driverCode === '1146'
            ) {
                return [
                    'schema_missing_table',
                    'A required database table is missing. Run migrations on the server, then retry.',
                ];
            }

            if (str_contains($raw, 'access denied')
                || str_contains($raw, 'connection refused')
                || str_contains($raw, 'could not find driver')
                || str_contains($raw, 'server has gone away')
            ) {
                return [
                    'database_unavailable',
                    'Database connection failed. Check DB credentials and that MySQL is running.',
                ];
            }

            return [
                'database_query_failed',
                'A database query failed while loading this page. Check server logs for details.',
            ];
        }

        if ($e instanceof ValueError) {
            $raw = strtolower($e->getMessage());
            if (str_contains($raw, 'itemcategory') || str_contains($raw, 'is not a valid backing value')) {
                return [
                    'invalid_catalog_category',
                    'Catalog data includes an invalid category. Fix warehouse item categories, then retry.',
                ];
            }

            return [
                'invalid_data',
                'The server rejected invalid data while processing this request.',
            ];
        }

        if ($e instanceof \Error && str_contains(strtolower($e->getMessage()), 'bcsub')) {
            return [
                'missing_php_extension',
                'PHP bcmath extension is missing on the server. Enable bcmath, then retry.',
            ];
        }

        if ($e instanceof \Error && str_contains(strtolower($e->getMessage()), 'call to undefined function bc')) {
            return [
                'missing_php_extension',
                'PHP bcmath extension is missing on the server. Enable bcmath, then retry.',
            ];
        }

        return [
            'server_error',
            'Server error while loading this page. Check storage/logs/laravel.log on the server.',
        ];
    }

    protected static function sanitizeDetail(string $message): string
    {
        $cleaned = preg_replace('/\s+/', ' ', trim($message)) ?? $message;
        // Strip absolute Windows/Unix paths from debug detail.
        $cleaned = preg_replace('#[A-Za-z]:\\\\[^\s]+#', '[path]', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('#/(?:var|home|Users|usr)/[^\s]+#', '[path]', $cleaned) ?? $cleaned;

        return mb_substr($cleaned, 0, 500);
    }
}
