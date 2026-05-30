<?php

namespace App\Services\Procurement;

use App\Services\Audit\OwenAuditLogger;
use Illuminate\Database\Eloquent\Model;

class ProcurementAuditLogger
{
    public function __construct(
        protected OwenAuditLogger $audit,
    ) {}

    public function log(string $action, Model $entity, ?array $oldValues = null, ?array $newValues = null): void
    {
        $this->audit->log(
            module: 'procurement',
            action: $action,
            entityType: class_basename($entity),
            entityId: (int) $entity->getKey(),
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }
}
