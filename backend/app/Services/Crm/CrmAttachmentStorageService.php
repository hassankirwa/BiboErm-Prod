<?php

namespace App\Services\Crm;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CrmAttachmentStorageService
{
    protected string $disk = 'public';

    protected string $directory = 'crm';

    /** @return array{path: string, url: string} */
    public function store(UploadedFile $file, string $subdir = ''): array
    {
        $folder = trim($this->directory.'/'.$subdir, '/');
        $filename = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs($folder, $filename, $this->disk);

        return [
            'path' => $path,
            'url' => Storage::disk($this->disk)->url($path),
        ];
    }
}
