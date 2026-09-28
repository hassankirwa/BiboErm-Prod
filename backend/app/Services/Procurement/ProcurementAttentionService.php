<?php

namespace App\Services\Procurement;

use App\Enums\ProjectStage;
use App\Models\Project;
use App\Services\Procurement\Requisitions\RequisitionSourceService;
use App\Services\Projects\ProjectMaterialStatusService;
use Illuminate\Support\Facades\Cache;

class ProcurementAttentionService
{
    private const CACHE_KEY = 'procurement.attention.summary';

    private const CACHE_SECONDS = 60;

    public function __construct(
        protected ProjectMaterialStatusService $materialStatus,
        protected RequisitionSourceService $requisitionSources,
    ) {}

    /**
     * Counts that should surface on the procurement dashboard / hub badge
     * so staff do not need to open Create Requisition to notice shortages.
     *
     * @return array{
     *     projects_awaiting_procurement: int,
     *     projects_with_material_shortages: int,
     *     project_material_lines_needing_requisition: int,
     *     low_stock_items_needing_requisition: int
     * }
     */
    public function summary(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_SECONDS, fn () => $this->computeSummary());
    }

    /**
     * Extra pending count for the workspace procurement tile.
     * Project-material shortages only — catalog low stock is tracked on warehouse.
     */
    public function attentionCount(): int
    {
        return $this->summary()['projects_with_material_shortages'];
    }

    /**
     * @return array{
     *     projects_awaiting_procurement: int,
     *     projects_with_material_shortages: int,
     *     project_material_lines_needing_requisition: int,
     *     low_stock_items_needing_requisition: int
     * }
     */
    protected function computeSummary(): array
    {
        $projectsAwaiting = Project::query()
            ->where('stage', ProjectStage::AwaitingProcurement->value)
            ->count();

        $projectsWithShortages = 0;
        $actionableLines = 0;

        $projects = Project::query()
            ->whereNotIn('stage', [ProjectStage::ProjectComplete->value])
            ->whereHas('latestBom.lines')
            ->with(['latestBom.lines.warehouseItem'])
            ->limit(200)
            ->get();

        foreach ($projects as $project) {
            $status = $this->materialStatus->build($project);
            $shortageLines = collect($status['lines'] ?? [])
                ->filter(function (array $line) {
                    if (bccomp((string) ($line['shortage_qty'] ?? '0'), '0.000', 3) === 1) {
                        return true;
                    }

                    return (bool) ($line['is_procurement_only'] ?? false);
                });

            $actionable = $shortageLines->filter(
                fn (array $line) => (bool) ($line['can_create_requisition'] ?? false)
            );

            if ($actionable->isEmpty()) {
                continue;
            }

            $projectsWithShortages++;
            $actionableLines += $actionable->count();
        }

        $lowStockActionable = collect($this->requisitionSources->lowStockSource())
            ->where('can_create_requisition', true)
            ->count();

        return [
            'projects_awaiting_procurement' => $projectsAwaiting,
            'projects_with_material_shortages' => $projectsWithShortages,
            'project_material_lines_needing_requisition' => $actionableLines,
            'low_stock_items_needing_requisition' => $lowStockActionable,
        ];
    }
}
