<?php

namespace App\Http\Middleware;

use App\Exceptions\UploadRejectedException;
use App\Support\UploadDiagnostics;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Replaces Laravel's opaque "The file failed to upload." with a limit-aware
 * message and writes the PHP upload snapshot to laravel.log.
 */
class ClarifyFailedUploads
{
    public function handle(Request $request, Closure $next): Response
    {
        $failed = UploadDiagnostics::failedFiles($request);

        if ($failed !== []) {
            throw UploadRejectedException::fromPhpFile($request, $failed[0]);
        }

        return $next($request);
    }
}
