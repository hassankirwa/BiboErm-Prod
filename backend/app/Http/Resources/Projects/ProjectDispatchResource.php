<?php

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectDispatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'driver_id' => $this->driver_id,
            'status' => $this->status instanceof \BackedEnum ? $this->status->value : $this->status,
            'vehicle_reg' => $this->vehicle_reg,
            'vehicle_details' => $this->vehicle_details,
            'dispatched_at' => $this->dispatched_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'packing_notes' => $this->packing_notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'driver' => $this->whenLoaded('driver', fn () => [
                'id' => $this->driver->id,
                'code' => $this->driver->code,
                'name' => $this->driver->name,
                'phone' => $this->driver->phone,
                'status' => $this->driver->status instanceof \BackedEnum
                    ? $this->driver->status->value
                    : $this->driver->status,
                'vehicle_registration' => $this->driver->vehicle_registration,
            ]),
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator?->id,
                'name' => $this->creator?->name,
            ]),
        ];
    }
}
