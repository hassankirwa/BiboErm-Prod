<?php

namespace App\Http\Resources\Warehouse;

use App\Services\Projects\ProjectFifoOrderService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $liveFifo = $this->project_id
            ? app(ProjectFifoOrderService::class)->positionFor((int) $this->project_id)
            : null;

        return [
            'id' => $this->id,
            'reservation_number' => $this->reservation_number,
            'project_id' => $this->project_id,
            'status' => $this->status?->value ?? $this->status,
            'reserved_at' => $this->reserved_at?->toIso8601String(),
            'released_at' => $this->released_at?->toIso8601String(),
            'reserved_by' => $this->reserved_by,
            'received_by' => $this->received_by,
            'fifo_sequence' => $liveFifo ?? $this->fifo_sequence,
            'fifo_order' => $liveFifo,
            'notes' => $this->notes,
            'release_notes' => $this->release_notes,
            'lines' => StockReservationLineResource::collection($this->whenLoaded('lines')),
            'received_by_user' => $this->whenLoaded('receivedByUser', fn () => [
                'id' => $this->receivedByUser->id,
                'name' => $this->receivedByUser->name,
            ]),
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'reference' => $this->project->reference,
                'name' => $this->project->name,
                'fifo_order' => $liveFifo,
            ]),
        ];
    }
}
