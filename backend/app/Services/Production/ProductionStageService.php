<?php

namespace App\Services\Production;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Events\Production\ProductionStageCompleted;
use App\Models\Production\ProductionOrder;
use App\Models\Production\ProductionStageLog;
use App\Models\User;
use App\Services\Warehouse\Offcuts\OffcutLoggingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionStageService
{
    public function __construct(
        protected MaterialReleaseRequestService $materialRelease,
        protected ProductionAuditLogger $audit,
        protected OffcutLoggingService $offcutLogging,
        protected ProductionGlassRequirementService $glassRequirement,
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

            return $log;
        });
    }

    /**
     * @param  list<array{item_id: int, bin_id: int, length_mm: int, quantity_pieces?: int, notes?: string|null}>|null  $offcuts
     */
    public function complete(
        ProductionOrder $order,
        ProductionStage $stage,
        User $user,
        ?string $notes = null,
        ?array $offcuts = null,
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

        return DB::transaction(function () use ($order, $stage, $user, $notes, $log, $offcuts) {
            if ($stage === ProductionStage::Cutting && is_array($offcuts)) {
                foreach ($offcuts as $offcut) {
                    $this->offcutLogging->logFromArray($user, $offcut, $order->project_id);
                }
            }

            $log->update([
                'status' => 'completed',
                'completed_by' => $user->id,
                'completed_at' => now(),
                'notes' => $notes ?? $log->notes,
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
        if ($stage !== ProductionStage::GlassAssembly) {
            throw ValidationException::withMessages([
                'stage' => ['Only glass assembly can be skipped.'],
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

        $context = $this->glassRequirement->glassAssemblyContext($order->project_id);

        if (! $context['can_skip']) {
            throw ValidationException::withMessages([
                'glass' => ['Glass assembly cannot be skipped when the project requires glass.'],
            ]);
        }

        $existingLog = ProductionStageLog::query()
            ->where('production_order_id', $order->id)
            ->where('stage', $stage->value)
            ->exists();

        if ($existingLog) {
            throw ValidationException::withMessages([
                'stage' => ['Glass assembly has already been started, skipped, or completed.'],
            ]);
        }

        return DB::transaction(function () use ($order, $stage, $user, $notes) {
            $log = ProductionStageLog::query()->create([
                'production_order_id' => $order->id,
                'stage' => $stage,
                'status' => 'skipped',
                'completed_by' => $user->id,
                'completed_at' => now(),
                'notes' => $notes ?? 'Skipped — no glass on project',
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
