<?php

namespace App\Http\Resources\Crm;

use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadPhotoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $url = null;
        if ($this->file_path) {
            $url = BiboStorage::resolveStoredUrl($this->file_path);
        }
        if (! $url) {
            $url = $this->firebase_url;
        }

        return [
            'id' => $this->id,
            'file_path' => $this->file_path,
            'firebase_url' => $this->firebase_url,
            'url' => $url,
            'caption' => $this->caption,
            'sort_order' => $this->sort_order,
            'uploaded_by' => $this->uploaded_by,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
