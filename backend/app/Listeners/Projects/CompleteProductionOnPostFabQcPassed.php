<?php

namespace App\Listeners\Projects;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\ProjectStage;
use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcInspectionResult;
use App\Events\QualityControl\QcInspectionCompleted;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\QualityControl\QcInspection;
use App\Services\Projects\ProjectStageService;
use App\Services\QualityControl\QcInspectionService;

/**
 * Post-fabrication QC pass marks the production order completed (only when every
 * opening has passed) and moves the project to qc_pre_installation.
 */
class CompleteProductionOnPostFabQcPassed
{
    public function __construct(
        protected ProjectStageService $stages,
        protected QcInspectionService $qcInspections,
    ) {}

    public function handle(QcInspectionCompleted $event): void
    {
        if ($event->context !== QcInspectionContext::ProductionQcPostFabrication->value) {
            return;
        }

        if (! in_array($event->result, [
            QcInspectionResult::Pass->value,
            QcInspectionResult::ConditionalPass->value,
        ], true)) {
            return;
        }

        $inspection = QcInspection::query()->find($event->inspectionId);
        if (! $inspection?->production_order_id) {
            return;
        }

        $order = ProductionOrder::query()->find($inspection->production_order_id);
        if (! $order) {
            return;
        }

        // Wait until every opening (or the single job-level inspection) has passed.
        if (! $this->qcInspections->hasPassedPostFabricationQc($order->project_id, $order->id)) {
            return;
        }

        if ($order->status !== ProductionOrderStatus::Completed) {
            $order->update([
                'status' => ProductionOrderStatus::Completed,
                'actual_end' => $order->actual_end ?? now()->toDateString(),
            ]);
        }

        if (! $event->projectId) {
            return;
        }

        $project = Project::query()->find($event->projectId);
        if (! $project) {
            return;
        }

        $target = ProjectStage::QcPreInstallation;
        $current = $this->stages->currentStage($project);

        if ($current === $target) {
            return;
        }

        if ($this->isAtOrPast($project, $target)) {
            return;
        }

        if ($this->stages->canTransition($project, $target)) {
            $this->stages->transition($project, $target, null, [
                'reason' => 'post_fab_qc_passed',
            ]);

            return;
        }

        $this->stages->transition($project, $target, null, [
            'force' => true,
            'reason' => 'post_fab_qc_passed',
        ]);
    }

    protected function isAtOrPast(Project $project, ProjectStage $minimum): bool
    {
        $stages = [
            ProjectStage::AwaitingDeposit,
            ProjectStage::DepositReceived,
            ProjectStage::SiteAssessment,
            ProjectStage::FinalDesignApproval,
            ProjectStage::BomFinalized,
            ProjectStage::MaterialCheck,
            ProjectStage::MaterialsReserved,
            ProjectStage::AwaitingProcurement,
            ProjectStage::MaterialsReady,
            ProjectStage::MaterialsReleased,
            ProjectStage::CuttingStage,
            ProjectStage::FabricationStage,
            ProjectStage::GlassAssembly,
            ProjectStage::QcPreInstallation,
            ProjectStage::InTransit,
            ProjectStage::Installation,
            ProjectStage::SiteQc,
            ProjectStage::Snagging,
            ProjectStage::ProjectComplete,
        ];

        $current = $this->stages->currentStage($project);
        $currentIndex = array_search($current, $stages, true);
        $minimumIndex = array_search($minimum, $stages, true);

        if ($currentIndex === false || $minimumIndex === false) {
            return false;
        }

        return $currentIndex >= $minimumIndex;
    }
}
