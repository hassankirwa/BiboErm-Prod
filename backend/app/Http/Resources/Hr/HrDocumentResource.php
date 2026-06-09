<?php

namespace App\Http\Resources\Hr;

use App\Models\HrDocument;
use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin HrDocument */
class HrDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name,
            'title' => $this->title,
            'category' => $this->category,
            'filename' => $this->filename,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'uploaded_by' => $this->uploaded_by,
            'uploader_name' => $this->uploader?->name,
            'download_url' => BiboStorage::resolvePrivateApiUrl($this->file_path),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
