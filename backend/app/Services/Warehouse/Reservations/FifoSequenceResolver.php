<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\ProjectStage;
use App\Models\Project;

class FifoSequenceResolver
{
    /**
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

    public function sequenceForProject(int $projectId): int
    {
        $queue = $this->orderedQueueIncluding($projectId);
        $position = array_search($projectId, $queue, true);

        return $position === false ? 1 : $position + 1;
    }

    /**
     * @return list<int>
     */
    public function projectIdsAheadOf(int $projectId): array
    {
        $queue = $this->orderedQueueIncluding($projectId);
        $position = array_search($projectId, $queue, true);

        if ($position === false || $position === 0) {
            return [];
        }

        return array_slice($queue, 0, $position);
    }

    /**
     * @return list<int>
     */
    protected function orderedQueueIncluding(int $projectId): array
    {
        $queue = Project::query()
            ->whereIn('stage', self::pipelineStages())
            ->orderBy('id')
            ->pluck('id')
            ->all();

        if (! in_array($projectId, $queue, true)) {
            $queue[] = $projectId;
            sort($queue);
        }

        return $queue;
    }
}
