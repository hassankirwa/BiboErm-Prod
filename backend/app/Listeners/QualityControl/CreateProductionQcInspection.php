<?php

namespace App\Listeners\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use App\Events\Production\ProductionStageCompleted;
use App\Models\QualityControl\QcInspection;
use App\Services\QualityControl\QcInspectionService;
class CreateProductionQcInspection
{
    public function __construct(
        protected QcInspectionService $inspections,
    ) {}

    public function handle(ProductionStageCompleted $event): void
    {
        $context = match ($event->productionStage) {
            'qc_pre_check' => QcInspectionContext::ProductionQcPreCheck,
            'qc_post_fabrication' => QcInspectionContext::ProductionQcPostFabrication,
            default => null,
        };

        if (! $context) {
            return;
        }

        $exists = QcInspection::query()
            ->where('production_order_id', $event->productionOrderId)
            ->where('context', $context)
            ->where('result', 'pending')
            ->exists();

        if ($exists) {
            return;
        }

        $inspector = \App\Models\User::permission('qc.inspect')->first();

        if (! $inspector) {
            return;
        }

        $this->inspections->start($inspector, [
            'context' => $context->value,
            'project_id' => $event->projectId,
            'production_order_id' => $event->productionOrderId,
        ]);
    }
}
