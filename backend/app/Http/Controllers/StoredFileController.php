<?php

namespace App\Http\Controllers;

use App\Services\Media\StoredFileAccessService;
use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StoredFileController extends Controller
{
    public function __construct(
        private readonly StoredFileAccessService $access,
    ) {}

    public function show(Request $request, string $category, string $owner, string $filename): StreamedResponse|Response
    {
        if (! preg_match('/^[a-zA-Z0-9._-]+$/', $owner)
            || ! preg_match('/^[a-zA-Z0-9._-]+$/', $category)
            || ! preg_match('/^[a-zA-Z0-9._-]+$/', $filename)) {
            abort(404);
        }

        $relativePath = "private/{$category}/{$owner}/{$filename}";

        /** @var \App\Models\User $user */
        $user = $request->user();

        if (! $this->access->canAccess($user, $relativePath)) {
            abort(403);
        }

        $disk = Storage::disk(BiboStorage::diskName());

        if (! $disk->exists($relativePath)) {
            abort(404);
        }

        $mime = $disk->mimeType($relativePath) ?: 'application/octet-stream';

        return response()->stream(function () use ($disk, $relativePath): void {
            $stream = $disk->readStream($relativePath);

            if (! is_resource($stream)) {
                return;
            }

            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.basename($filename).'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }
}
