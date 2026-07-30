<?php

namespace App\Http\Resources\Production;

use App\Models\Production\ProductionStageLog;
use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProductionStageLog */
class ProductionStageLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $paths = $this->resource->evidencePaths();
        $urls = array_map(
            fn (string $path) => BiboStorage::resolvePrivateApiUrl($path),
            $paths,
        );

        return [
            'id' => $this->id,
            'production_order_id' => $this->production_order_id,
            'stage' => $this->stage?->value,
            'stage_label' => $this->stage?->label(),
            'status' => $this->status,
            'completed_by' => $this->completed_by,
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'notes' => $this->notes,
            'evidence_path' => $paths[0] ?? null,
            'evidence_url' => $urls[0] ?? null,
            'evidence_paths' => $paths,
            'evidence_urls' => $urls,
        ];
    }
}
