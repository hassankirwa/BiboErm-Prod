<?php

namespace App\Services\QualityControl;

use App\Services\Media\FileStorageService;
use Illuminate\Http\UploadedFile;

class QcPhotoStorageService
{
    public function __construct(
        protected FileStorageService $files,
    ) {}

    /**
     * @return array{path: string, url: string|null}
     */
    public function store(UploadedFile $file, int $inspectionId): array
    {
        $stored = $this->files->store($file, 'qc-photos', 'inspection-'.$inspectionId);

        return [
            'path' => $stored['path'],
            'url' => $stored['url'],
        ];
    }
}
