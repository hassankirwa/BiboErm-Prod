<?php

namespace App\Http\Resources\QualityControl;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QcProjectSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'name' => $this->name,
            'stage' => $this->stage,
            'priority' => $this->priority,
            'completion_percent' => $this->completion_percent,
            'site_address' => $this->site_address,
            'type' => $this->type,
            'location_type' => $this->location_type,
            'project_manager' => $this->whenLoaded('projectManager', fn () => $this->projectManager ? [
                'id' => $this->projectManager->id,
                'name' => $this->projectManager->name,
                'email' => $this->projectManager->email,
            ] : null),
            'account' => $this->whenLoaded('account', fn () => $this->account ? [
                'id' => $this->account->id,
                'name' => $this->account->name,
            ] : null),
        ];
    }
}
