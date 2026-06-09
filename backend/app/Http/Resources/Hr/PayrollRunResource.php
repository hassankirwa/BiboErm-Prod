<?php

namespace App\Http\Resources\Hr;

use App\Models\PayrollRun;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PayrollRun */
class PayrollRunResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'period_year' => $this->period_year,
            'period_month' => $this->period_month,
            'period_label' => sprintf('%02d/%d', $this->period_month, $this->period_year),
            'status' => $this->status,
            'created_by' => $this->created_by,
            'creator_name' => $this->creator?->name,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'approved_by' => $this->approved_by,
            'approver_name' => $this->approver?->name,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'rejection_reason' => $this->rejection_reason,
            'notes' => $this->notes,
            'entries' => PayrollEntryResource::collection($this->whenLoaded('entries')),
            'entries_count' => $this->whenCounted('entries'),
            'total_gross' => $this->when(
                $this->relationLoaded('entries'),
                fn () => round((float) $this->entries->sum('gross_salary'), 2),
            ),
            'total_net' => $this->when(
                $this->relationLoaded('entries'),
                fn () => round((float) $this->entries->sum('net_pay'), 2),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
