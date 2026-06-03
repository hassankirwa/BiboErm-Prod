<?php

namespace App\Http\Resources\Production;

use App\Models\Production\ProductionOrderTeam;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProductionOrderTeam */
class ProductionOrderTeamResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'production_order_id' => $this->production_order_id,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'stage' => $this->stage?->value,
            'role' => $this->role?->value,
            'assigned_at' => $this->assigned_at?->toIso8601String(),
            'assigned_by' => $this->assigned_by,
            'notes' => $this->notes,
        ];
    }
}
