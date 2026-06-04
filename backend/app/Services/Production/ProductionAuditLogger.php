<?php

namespace App\Services\Production;

use App\Services\Audit\OwenAuditLogger;
use Illuminate\Database\Eloquent\Model;

class ProductionAuditLogger
{
    public function __construct(
        protected OwenAuditLogger $audit,
    ) {}

    public function orderCreated(Model $order, ?array $context = null): void
    {
        $this->log('production.order_created', $order, null, $context ?? $order->toArray());
    }

    public function stageStarted(Model $log, ?array $context = null): void
    {
        $this->log('production.stage_started', $log, null, $context ?? $log->toArray());
    }

    public function stageCompleted(Model $log, ?array $context = null): void
    {
        $this->log('production.stage_completed', $log, null, $context ?? $log->toArray());
    }

    public function stageSkipped(Model $log, ?array $context = null): void
    {
        $this->log('production.stage_skipped', $log, null, $context ?? $log->toArray());
    }

    public function scheduleReordered(Model $order, ?array $oldValues, ?array $newValues): void
    {
        $this->log('production.schedule_reordered', $order, $oldValues, $newValues);
    }

    public function orderStatusChanged(Model $order, ?array $oldValues, ?array $newValues): void
    {
        $this->log('production.order_status_changed', $order, $oldValues, $newValues);
    }

    public function cuttingSheetGenerated(Model $sheet, ?array $context = null): void
    {
        $this->log('production.cutting_sheet_generated', $sheet, null, $context ?? $sheet->toArray());
    }

    public function cuttingSheetLineUpdated(Model $sheet, ?array $oldValues, ?array $newValues): void
    {
        $this->log('production.cutting_sheet_line_updated', $sheet, $oldValues, $newValues);
    }

    public function teamAssigned(Model $team, ?array $context = null): void
    {
        $this->log('production.team_assigned', $team, null, $context ?? $team->toArray());
    }

    protected function log(string $action, Model $entity, ?array $oldValues, ?array $newValues): void
    {
        $this->audit->log(
            module: 'production',
            action: $action,
            entityType: $entity->getTable(),
            entityId: (int) $entity->getKey(),
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }
}
