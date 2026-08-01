<?php

namespace App\Services\Production;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcInspectionResult;
use App\Enums\Warehouse\OffcutStorageArea;
use App\Events\Production\ProductionStageCompleted;
use App\Models\Production\CuttingSheet;
use App\Models\Production\ProductionOrder;
use App\Models\Production\ProductionOrderTeam;
use App\Models\Production\ProductionStageLog;
use App\Models\QualityControl\QcInspection;
use App\Models\User;
use App\Services\Media\FileStorageService;
use App\Services\QualityControl\QcInspectionService;
use App\Services\Warehouse\Offcuts\OffcutLoggingService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionStageService
{
    public function __construct(
        protected MaterialReleaseRequestService $materialRelease,
        protected ProductionAuditLogger $audit,
        protected OffcutLoggingService $offcutLogging,
        protected ProductionGlassRequirementService $glassRequirement,
        protected FileStorageService $files,
        protected CuttingSheetService $cuttingSheets,
        protected QcInspectionService $qcInspections,
    ) {}

    public function start(ProductionOrder $order, ProductionStage $stage, User $user, ?string $notes = null): ProductionStageLog
    {
        if (! $order->isActive()) {
            throw ValidationException::withMessages([
                'order' => ['Production order is not active.'],
            ]);
        }

        if ($order->current_stage !== $stage) {
            throw ValidationException::withMessages([
                'stage' => ["Expected current stage {$order->current_stage->value}, received {$stage->value}."],
            ]);
        }

        $openLog = ProductionStageLog::query()
            ->where('production_order_id', $order->id)
            ->where('stage', $stage->value)
            ->where('status', 'started')
            ->whereNull('completed_at')
            ->exists();

        if ($openLog) {
            throw ValidationException::withMessages([
                'stage' => ['This stage has already been started.'],
            ]);
        }

        if ($stage === ProductionStage::GlassAssembly) {
            $this->assertGlassAssemblyCanStart($order);
        }

        return DB::transaction(function () use ($order, $stage, $user, $notes) {
            if ($order->status === ProductionOrderStatus::Scheduled) {
                $order->status = ProductionOrderStatus::InProgress;
                $order->actual_start ??= now()->toDateString();
                $order->save();
            }

            $this->materialRelease->releaseForStageStart($order, $stage, $user);

            $log = ProductionStageLog::query()->create([
                'production_order_id' => $order->id,
                'stage' => $stage,
                'status' => 'started',
                'started_at' => now(),
                'notes' => $notes,
            ]);

            $this->audit->stageStarted($log, [
                'stage' => $stage->value,
                'production_order_id' => $order->id,
            ]);

            if ($stage === ProductionStage::QcPostFabrication) {
                $this->qcInspections->createFromProductionStage(
                    $order->project_id,
                    $order->id,
                    ProductionStage::QcPostFabrication->value,
                );
            }

            return $log;
        });
    }

    /**
     * @param  list<array{item_id: int, bin_id: int, length_mm: int, quantity_pieces?: int, notes?: string|null}>|null  $offcuts
     * @param  list<UploadedFile>  $evidenceFiles
     * @param  list<int>  $discardWasteLineIds  Cutting sheet line ids whose waste should not be logged
     */
    public function complete(
        ProductionOrder $order,
        ProductionStage $stage,
        User $user,
        ?string $notes = null,
        ?array $offcuts = null,
        ?UploadedFile $evidence = null,
        array $discardWasteLineIds = [],
        array $evidenceFiles = [],
    ): ProductionStageLog {
        if (! $order->isActive()) {
            throw ValidationException::withMessages([
                'order' => ['Production order is not active.'],
            ]);
        }

        if ($order->current_stage !== $stage) {
            throw ValidationException::withMessages([
                'stage' => ["Expected current stage {$order->current_stage->value}, received {$stage->value}."],
            ]);
        }

        $log = ProductionStageLog::query()
            ->where('production_order_id', $order->id)
            ->where('stage', $stage->value)
            ->where('status', 'started')
            ->whereNull('completed_at')
            ->latest('id')
            ->first();

        if (! $log) {
            throw ValidationException::withMessages([
                'stage' => ['Stage must be started before it can be completed.'],
            ]);
        }

        $requiresNotes = in_array($stage, [
            ProductionStage::MaterialPrep,
            ProductionStage::Fabrication,
            ProductionStage::Sash,
        ], true);

        if ($requiresNotes) {
            if ($stage === ProductionStage::MaterialPrep) {
                $this->assertStageHasAssignee($order, $stage);
            }

            $trimmedNotes = is_string($notes) ? trim($notes) : '';
            if ($trimmedNotes === '') {
                throw ValidationException::withMessages([
                    'notes' => ['Notes are required before closing this stage.'],
                ]);
            }
            $notes = $trimmedNotes;
        }

        if ($stage === ProductionStage::Cutting) {
            $this->assertCuttingSheetReady($order);
        }

        if ($stage === ProductionStage::QcPostFabrication) {
            $this->assertPostFabricationQcPassed($order);
        }

        $files = $evidenceFiles;
        if ($evidence !== null) {
            array_unshift($files, $evidence);
        }
        $files = array_values(array_filter(
            $files,
            fn ($file) => $file instanceof UploadedFile,
        ));

        $evidencePaths = [];
        foreach ($files as $file) {
            $stored = $this->files->store(
                $file,
                'production-stage-evidence',
                'order-'.$order->id,
            );
            $evidencePaths[] = $stored['path'];
        }

        $evidencePath = ProductionStageLog::encodeEvidencePaths($evidencePaths);

        return DB::transaction(function () use ($order, $stage, $user, $notes, $log, $offcuts, $evidencePath, $discardWasteLineIds) {
            if ($stage === ProductionStage::Cutting) {
                $this->logCuttingSheetWasteOffcuts($order, $user, $offcuts ?? [], $discardWasteLineIds);

                if (is_array($offcuts)) {
                    foreach ($offcuts as $offcut) {
                        $this->offcutLogging->logFromArray($user, $offcut, $order->project_id);
                    }
                }
            }

            $log->update([
                'status' => 'completed',
                'completed_by' => $user->id,
                'completed_at' => now(),
                'notes' => $notes ?? $log->notes,
                'evidence_path' => $evidencePath ?? $log->evidence_path,
            ]);

            $next = $stage->next();

            if ($next) {
                $order->current_stage = $next;
            } else {
                $order->status = ProductionOrderStatus::Completed;
                $order->actual_end = now()->toDateString();
            }

            $order->save();

            $this->audit->stageCompleted($log, [
                'stage' => $stage->value,
                'production_order_id' => $order->id,
            ]);

            if ($stage->emitsProductionStageCompleted()) {
                event(new ProductionStageCompleted(
                    projectId: $order->project_id,
                    productionOrderId: $order->id,
                    productionStage: $stage->value,
                    completedByUserId: $user->id,
                ));
            }

            return $log->fresh();
        });
    }

    public function skip(ProductionOrder $order, ProductionStage $stage, User $user, ?string $notes = null): ProductionStageLog
    {
        if (! in_array($stage, [ProductionStage::GlassAssembly, ProductionStage::QcPreCheck], true)) {
            throw ValidationException::withMessages([
                'stage' => ['Only glass assembly and QC pre-check can be skipped.'],
            ]);
        }

        if (! $order->isActive()) {
            throw ValidationException::withMessages([
                'order' => ['Production order is not active.'],
            ]);
        }

        if ($order->current_stage !== $stage) {
            throw ValidationException::withMessages([
                'stage' => ["Expected current stage {$order->current_stage->value}, received {$stage->value}."],
            ]);
        }

        if ($stage === ProductionStage::GlassAssembly) {
            $context = $this->glassRequirement->glassAssemblyContext($order->project_id);

            if (! $context['can_skip']) {
                throw ValidationException::withMessages([
                    'glass' => ['Glass assembly cannot be skipped when the project requires glass.'],
                ]);
            }
        }

        $existingLog = ProductionStageLog::query()
            ->where('production_order_id', $order->id)
            ->where('stage', $stage->value)
            ->exists();

        if ($existingLog) {
            throw ValidationException::withMessages([
                'stage' => ["{$stage->label()} has already been started, skipped, or completed."],
            ]);
        }

        $defaultNotes = $stage === ProductionStage::QcPreCheck
            ? 'Skipped — formal QC after assembly'
            : 'Skipped — no glass on project';

        return DB::transaction(function () use ($order, $stage, $user, $notes, $defaultNotes) {
            $log = ProductionStageLog::query()->create([
                'production_order_id' => $order->id,
                'stage' => $stage,
                'status' => 'skipped',
                'completed_by' => $user->id,
                'completed_at' => now(),
                'notes' => $notes ?? $defaultNotes,
            ]);

            $next = $stage->next();

            if ($next) {
                $order->current_stage = $next;
            }

            $order->save();

            $this->audit->stageSkipped($log, [
                'stage' => $stage->value,
                'production_order_id' => $order->id,
            ]);

            return $log->fresh();
        });
    }

    private function assertStageHasAssignee(ProductionOrder $order, ProductionStage $stage): void
    {
        $assigned = ProductionOrderTeam::query()
            ->where('production_order_id', $order->id)
            ->where('stage', $stage->value)
            ->exists();

        if (! $assigned) {
            throw ValidationException::withMessages([
                'assignee' => [
                    'Assign a team member to materials & tools assembly before completing this stage.',
                ],
            ]);
        }
    }

    private function assertCuttingSheetReady(ProductionOrder $order): void
    {
        $lines = CuttingSheet::query()
            ->where('production_order_id', $order->id)
            ->get([
                'id',
                'cut_length_mm',
                'pieces',
                'cuts',
                'planned_used_mm',
                'bar_length_mm',
                'waste_mm',
            ]);

        if ($lines->isEmpty()) {
            throw ValidationException::withMessages([
                'cutting_sheet' => ['Generate a cutting sheet before completing cutting.'],
            ]);
        }

        $incomplete = $lines->first(function (CuttingSheet $line) {
            return $line->bar_length_mm === null || $line->waste_mm === null;
        });

        if ($incomplete) {
            throw ValidationException::withMessages([
                'cutting_sheet' => ['Fill bar length and waste on every cutting sheet line before completing cutting.'],
            ]);
        }

        foreach ($lines as $line) {
            try {
                $this->cuttingSheets->assertBarFitsCuts($line);
            } catch (ValidationException $e) {
                $message = collect($e->errors())->flatten()->first()
                    ?? 'Cut length and waste must fit within the logged bar length.';
                throw ValidationException::withMessages([
                    'cutting_sheet' => [$message],
                ]);
            }
        }
    }

    /**
     * Auto-log reusable remnants from cutting sheet waste (skip discarded lines and matching explicit offcuts).
     *
     * @param  list<array{item_id?: int, length_mm?: int}>  $explicitOffcuts
     * @param  list<int>  $discardWasteLineIds
     */
    private function logCuttingSheetWasteOffcuts(
        ProductionOrder $order,
        User $user,
        array $explicitOffcuts,
        array $discardWasteLineIds = [],
    ): void {
        $explicitKeys = [];
        foreach ($explicitOffcuts as $offcut) {
            if (! isset($offcut['item_id'], $offcut['length_mm'])) {
                continue;
            }
            $explicitKeys[(int) $offcut['item_id'].':'.(int) $offcut['length_mm']] = true;
        }

        $discarded = array_fill_keys(array_map('intval', $discardWasteLineIds), true);

        $lines = CuttingSheet::query()
            ->where('production_order_id', $order->id)
            ->whereNotNull('warehouse_item_id')
            ->where('waste_mm', '>', 0)
            ->get(['id', 'warehouse_item_id', 'waste_mm', 'profile_code']);

        foreach ($lines as $line) {
            if (isset($discarded[(int) $line->id])) {
                continue;
            }

            $itemId = (int) $line->warehouse_item_id;
            $lengthMm = (int) $line->waste_mm;
            $key = $itemId.':'.$lengthMm;

            if (isset($explicitKeys[$key])) {
                continue;
            }

            $this->offcutLogging->logFromArray($user, [
                'item_id' => $itemId,
                'length_mm' => $lengthMm,
                'quantity_pieces' => 1,
                'storage_area' => OffcutStorageArea::ProductionWorkspace->value,
                'notes' => 'Auto from cutting sheet waste ('.$line->profile_code.')',
            ], $order->project_id);
        }
    }

    private function assertGlassAssemblyCanStart(ProductionOrder $order): void
    {
        $context = $this->glassRequirement->glassAssemblyContext($order->project_id);

        if (! $context['requires_glass']) {
            throw ValidationException::withMessages([
                'glass' => ['This project has no glass. Skip glass assembly instead of starting it.'],
            ]);
        }

        if (! $context['glass_present']) {
            throw ValidationException::withMessages([
                'glass' => ['Glass must be delivered before starting glass assembly.'],
            ]);
        }
    }

    private function assertPostFabricationQcPassed(ProductionOrder $order): void
    {
        $passed = QcInspection::query()
            ->where('production_order_id', $order->id)
            ->where('context', QcInspectionContext::ProductionQcPostFabrication)
            ->whereIn('result', [
                QcInspectionResult::Pass,
                QcInspectionResult::ConditionalPass,
            ])
            ->exists();

        if (! $passed) {
            throw ValidationException::withMessages([
                'qc' => [
                    'Complete and pass after-assembly (post-fabrication) QC before closing this stage. This QC cannot be skipped.',
                ],
            ]);
        }
    }

    /**
     * @param  list<array{item_id: int, bin_id: int, length_mm: int, quantity_pieces?: int, notes?: string|null}>  $offcuts
     */
    public function logOffcuts(ProductionOrder $order, User $user, array $offcuts): void
    {
        if ($order->current_stage !== ProductionStage::Cutting) {
            throw ValidationException::withMessages([
                'stage' => ['Offcuts can only be logged while the order is in the cutting stage.'],
            ]);
        }

        foreach ($offcuts as $offcut) {
            $this->offcutLogging->logFromArray($user, $offcut, $order->project_id);
        }
    }
}
