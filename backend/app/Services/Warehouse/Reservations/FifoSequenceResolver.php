<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\ProjectStage;
use App\Models\Project;
use App\Services\Projects\ProjectFifoOrderService;

class FifoSequenceResolver
{
    public function __construct(
        protected ProjectFifoOrderService $fifoOrder,
    ) {}

    /**
     * Stages that participate in material demand / ahead-stock checks.
     *
     * @return list<string>
     */
    public static function pipelineStages(): array
    {
        return [
            ProjectStage::BomFinalized->value,
            ProjectStage::MaterialCheck->value,
            ProjectStage::MaterialsReserved->value,
            ProjectStage::AwaitingProcurement->value,
        ];
    }

    /**
     * Global FIFO tag (#) among all active incomplete projects.
     */
    public function sequenceForProject(int $projectId): int
    {
        return $this->fifoOrder->positionFor($projectId)
            ?? $this->fifoOrder->rankAmongActiveIncomplete($projectId)
            ?? 1;
    }

    /**
     * Projects ahead in the materials pipeline (by creation order) for stock demand.
     * Design-phase projects do not consume ahead demand even if they have a lower global #.
     *
     * @return list<int>
     */
    public function projectIdsAheadOf(int $projectId): array
    {
        $queue = $this->orderedMaterialsQueueIncluding($projectId);
        $position = array_search($projectId, $queue, true);

        if ($position === false || $position === 0) {
            return [];
        }

        return array_slice($queue, 0, $position);
    }

    /**
     * @return list<int>
     */
    /**
     * @return list<int>
     */
    protected function orderedMaterialsQueueIncluding(int $projectId): array
    {
        $queue = $this->materialsPipelineQueue();

        if (! in_array($projectId, $queue, true)) {
            $queue[] = $projectId;
            sort($queue);
        }

        return $queue;
    }

    /**
     * @return list<int>
     */
    protected function materialsPipelineQueue(): array
    {
        return once(function (): array {
            return Project::query()
                ->where('is_active', true)
                ->whereIn('stage', self::pipelineStages())
                ->orderBy('id')
                ->pluck('id')
                ->all();
        });
    }
}
