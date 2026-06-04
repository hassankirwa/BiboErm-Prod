<?php

namespace App\Services\QualityControl;

use App\Services\Audit\OwenAuditLogger;
use Illuminate\Database\Eloquent\Model;

class QcAuditLogger
{
    public function __construct(
        protected OwenAuditLogger $audit,
    ) {}

    public function log(string $action, Model $entity, ?array $oldValues = null, ?array $newValues = null): void
    {
        $entityType = match ($entity::class) {
            \App\Models\QualityControl\QcInspection::class => 'qc_inspection',
            \App\Models\QualityControl\QcDefect::class => 'qc_defect',
            \App\Models\QualityControl\QcChecklistTemplate::class => 'qc_checklist_template',
            \App\Models\QualityControl\QcInspectionSchedule::class => 'qc_inspection_schedule',
            default => class_basename($entity),
        };

        $this->audit->log(
            module: 'qc',
            action: $action,
            entityType: $entityType,
            entityId: (int) $entity->getKey(),
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }
}
