<?php

namespace App\Exceptions;

use App\Support\UploadDiagnostics;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class UploadRejectedException extends HttpException
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        string $message,
        int $status,
        public readonly string $errorCode,
        public readonly array $payload,
    ) {
        parent::__construct($status, $message);
    }

    public static function fromPhpFile(Request $request, UploadedFile $file): self
    {
        $errorCode = UploadDiagnostics::errorCodeName($file->getError());
        $message = UploadDiagnostics::messageForPhpError($file);
        $filename = $file->getClientOriginalName();

        UploadDiagnostics::logRejection($errorCode, $request, [
            'filename' => $filename,
            'declared_size' => $file->getSize() ?: null,
            'php_upload_error' => $errorCode,
            'php_upload_error_code' => $file->getError(),
        ]);

        return new self(
            $message,
            422,
            $errorCode,
            UploadDiagnostics::clientPayload($message, $errorCode, $request, $filename),
        );
    }
}
