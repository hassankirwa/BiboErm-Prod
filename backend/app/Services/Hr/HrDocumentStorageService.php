<?php

namespace App\Services\Hr;

use App\Services\Media\FileStorageService;
use Illuminate\Http\UploadedFile;

class HrDocumentStorageService
{
    public const CATEGORY = 'hr-documents';

    public function __construct(
        private readonly FileStorageService $files,
    ) {}

    /** @return array{path: string, url: string|null, filename: string, disk: string, category: string, public: bool} */
    public function store(UploadedFile $file, string $ownerSegment): array
    {
        return $this->files->store($file, self::CATEGORY, $ownerSegment);
    }

    public function deleteIfExists(?string $path): void
    {
        $this->files->delete($path);
    }
}
