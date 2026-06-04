<?php

namespace App\Http\Resources\FieldInstallation;

use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FieldInstallationPhotoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'job_id' => $this->job_id,
            'attachable_type' => $this->attachable_type?->value ?? $this->attachable_type,
            'attachable_id' => $this->attachable_id,
            'file_path' => $this->file_path,
            'firebase_url' => $this->firebase_url,
            'url' => $this->firebase_url ?? BiboStorage::resolvePrivateApiUrl($this->file_path),
            'caption' => $this->caption,
            'taken_at' => $this->taken_at?->toIso8601String(),
            'uploaded_by' => $this->uploaded_by,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
