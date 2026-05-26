<?php

namespace App\Http\Resources\Crm;

use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SiteVisitPhotoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $url = $this->firebase_url;
        if (! $url && $this->file_path) {
            $url = BiboStorage::resolvePublicUrl($this->file_path)
                ?? BiboStorage::resolvePrivateApiUrl($this->file_path);
        }

        return [
            'id' => $this->id,
            'file_path' => $this->file_path,
            'firebase_url' => $this->firebase_url,
            'url' => $url,
            'uploaded_by' => $this->uploaded_by,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
