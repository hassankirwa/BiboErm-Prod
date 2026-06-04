<?php

namespace App\Services\Production;

use App\Enums\Procurement\GlassOrderStatus;
use App\Models\Procurement\GlassOrder;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;

class ProductionGlassRequirementService
{
    public function projectRequiresGlass(int $projectId): bool
    {
        $bomIds = ProjectBom::query()
            ->where('project_id', $projectId)
            ->pluck('id');

        if ($bomIds->isEmpty()) {
            return false;
        }

        return ProjectBomLine::query()
            ->whereIn('bom_id', $bomIds)
            ->where(function ($query) {
                $query->where('is_glass', true)
                    ->orWhere('line_type', 'glass');
            })
            ->exists();
    }

    public function projectGlassIsPresent(int $projectId): bool
    {
        return GlassOrder::query()
            ->where('project_id', $projectId)
            ->where('status', GlassOrderStatus::Delivered)
            ->exists();
    }

    /**
     * @return array{
     *     requires_glass: bool,
     *     glass_present: bool,
     *     can_start: bool,
     *     can_skip: bool,
     *     glass_order_status: string|null
     * }
     */
    public function glassAssemblyContext(int $projectId): array
    {
        $requiresGlass = $this->projectRequiresGlass($projectId);
        $glassPresent = $requiresGlass && $this->projectGlassIsPresent($projectId);

        $latestOrder = GlassOrder::query()
            ->where('project_id', $projectId)
            ->where('status', '!=', GlassOrderStatus::Cancelled)
            ->latest('id')
            ->first();

        return [
            'requires_glass' => $requiresGlass,
            'glass_present' => $glassPresent,
            'can_start' => $requiresGlass && $glassPresent,
            'can_skip' => ! $requiresGlass,
            'glass_order_status' => $latestOrder?->status?->value ?? $latestOrder?->status,
        ];
    }
}
