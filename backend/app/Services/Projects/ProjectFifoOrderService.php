<?php

namespace App\Services\Projects;

use App\Enums\ProjectStage;
use App\Models\Project;

class ProjectFifoOrderService
{
    /**
     * Live FIFO position among active, incomplete projects (oldest created = #1).
     * Returns null when the project is inactive or complete (out of the queue).
     */
    public function positionFor(int $projectId): ?int
    {
        return $this->positionMap()[$projectId] ?? null;
    }

    /**
     * @param  list<int>  $projectIds
     * @return array<int, int|null> project_id => fifo_order
     */
    public function positionsFor(array $projectIds): array
    {
        $map = $this->positionMap();
        $result = [];

        foreach ($projectIds as $projectId) {
            $result[$projectId] = $map[$projectId] ?? null;
        }

        return $result;
    }

    /**
     * @return array<int, int> project_id => 1-based position
     */
    public function positionMap(): array
    {
        return once(function (): array {
            $ids = Project::query()
                ->where('is_active', true)
                ->where('stage', '!=', ProjectStage::ProjectComplete->value)
                ->orderBy('id')
                ->pluck('id')
                ->all();

            $map = [];

            foreach ($ids as $index => $id) {
                $map[(int) $id] = $index + 1;
            }

            return $map;
        });
    }

    /**
     * SQL-friendly expression: active incomplete first (by id), then the rest (by id).
     */
    public function applyListOrdering($query): mixed
    {
        $complete = ProjectStage::ProjectComplete->value;

        return $query
            ->orderByRaw(
                'CASE WHEN is_active = ? AND stage != ? THEN 0 ELSE 1 END ASC',
                [true, $complete]
            )
            ->orderBy('id');
    }

    /**
     * Count of active incomplete projects with a lower id (ahead in FIFO).
     * Useful when the full map is not needed.
     */
    public function rankAmongActiveIncomplete(int $projectId): ?int
    {
        $project = Project::query()->find($projectId);

        if ($project === null || ! $project->is_active) {
            return null;
        }

        $stage = $project->stage instanceof ProjectStage
            ? $project->stage->value
            : (string) $project->stage;

        if ($stage === ProjectStage::ProjectComplete->value) {
            return null;
        }

        $ahead = Project::query()
            ->where('is_active', true)
            ->where('stage', '!=', ProjectStage::ProjectComplete->value)
            ->where('id', '<', $projectId)
            ->count();

        return $ahead + 1;
    }
}
