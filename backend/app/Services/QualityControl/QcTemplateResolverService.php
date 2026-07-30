<?php

namespace App\Services\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use App\Models\QualityControl\QcChecklistTemplate;
use App\Models\QualityControl\QcInspection;

class QcTemplateResolverService
{
    public function resolve(
        QcInspectionContext $context,
        ?int $projectId = null,
        ?string $stage = null,
    ): ?QcChecklistTemplate {
        if ($projectId !== null) {
            $overrideQuery = QcChecklistTemplate::query()
                ->where('context', $context)
                ->where('project_id', $projectId)
                ->where('is_active', true)
                ->orderByDesc('version');

            if ($stage) {
                $stageOverride = (clone $overrideQuery)->where('stage', $stage)->first();
                if ($stageOverride) {
                    return $stageOverride;
                }
            }

            $override = $overrideQuery->first();
            if ($override) {
                return $override;
            }
        }

        $systemQuery = QcChecklistTemplate::query()
            ->where('context', $context)
            ->whereNull('project_id')
            ->where('is_active', true)
            ->where('is_system', true)
            ->orderByDesc('version');

        if ($stage) {
            $stageMatch = (clone $systemQuery)->where('stage', $stage)->first();
            if ($stageMatch) {
                return $stageMatch;
            }
        }

        // Prefer template whose stage matches the context value (pre/post gates).
        $contextStageMatch = (clone $systemQuery)->where('stage', $context->value)->first();
        if ($contextStageMatch) {
            return $contextStageMatch;
        }

        return $systemQuery->first();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function checklistItemsForInspection(QcInspection $inspection): array
    {
        $templateItems = $inspection->template?->items ?? [];
        $customItems = $inspection->custom_items ?? [];

        return array_values(array_merge($templateItems, $customItems));
    }
}
