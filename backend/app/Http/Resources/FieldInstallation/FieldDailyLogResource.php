<?php

namespace App\Http\Resources\FieldInstallation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FieldDailyLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'job_id' => $this->job_id,
            'log_date' => $this->log_date?->toDateString(),
            'submitted_by' => $this->submitted_by,
            'summary' => $this->summary,
            'units_completed' => $this->units_completed,
            'percent_today' => $this->percent_today,
            'weather' => $this->weather,
            'site_conditions' => $this->site_conditions,
            'blockers' => $this->blockers,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'submitter' => $this->whenLoaded('submitter', fn () => [
                'id' => $this->submitter->id,
                'name' => $this->submitter->name,
            ]),
            'photos' => FieldInstallationPhotoResource::collection($this->whenLoaded('photos')),
        ];
    }
}
