<?php

namespace App\Services\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use App\Models\QualityControl\QcChecklistTemplate;
use App\Models\QualityControl\QcInspection;

class QcTemplateResolverService
{
    public function resolve(QcInspectionContext $context, ?int $projectId = null): ?QcChecklistTemplate
    {
        if ($projectId !== null) {
            $override = QcChecklistTemplate::query()
                ->where('context', $context)
                ->where('project_id', $projectId)
                ->where('is_active', true)
                ->orderByDesc('version')
                ->first();

            if ($override) {
                return $override;
            }
        }

        return QcChecklistTemplate::query()
            ->where('context', $context)
            ->whereNull('project_id')
            ->where('is_active', true)
            ->where('is_system', true)
            ->orderByDesc('version')
            ->first();
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
