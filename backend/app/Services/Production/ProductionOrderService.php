<?php

namespace App\Services\Production;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Enums\ProjectStage;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\Warehouse\StockReservation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionOrderService
{
    public function __construct(
        protected ProductionReferenceGenerator $references,
        protected ProductionAuditLogger $audit,
    ) {}

    public function createFromMaterialsReady(int $projectId, int $fifoSequence): ?ProductionOrder
    {
        $project = Project::query()->find($projectId);

        if (! $project || $project->stage !== ProjectStage::MaterialsReady) {
            return null;
        }

        if ($this->hasActiveOrderForProject($projectId)) {
            return null;
        }

        return DB::transaction(function () use ($projectId, $fifoSequence) {
            $order = ProductionOrder::query()->create([
                'reference' => $this->references->next(),
                'project_id' => $projectId,
                'status' => ProductionOrderStatus::Scheduled,
                'current_stage' => ProductionStage::MaterialPrep,
                'fifo_position' => $fifoSequence,
            ]);

            $this->audit->orderCreated($order, [
                'project_id' => $projectId,
                'fifo_position' => $fifoSequence,
            ]);

            return $order->load('project');
        });
    }

    public function hasActiveOrderForProject(int $projectId): bool
    {
        return ProductionOrder::query()
            ->where('project_id', $projectId)
            ->whereIn('status', ProductionOrderStatus::activeValues())
            ->exists();
    }

    public function findActiveForProject(int $projectId): ?ProductionOrder
    {
        return ProductionOrder::query()
            ->where('project_id', $projectId)
            ->whereIn('status', ProductionOrderStatus::activeValues())
            ->first();
    }

    /**
     * @param  array{scheduled_start?: string|null, scheduled_end?: string|null}  $data
     */
    public function updateSchedule(ProductionOrder $order, array $data): ProductionOrder
    {
        if (array_key_exists('fifo_position', $data)) {
            throw ValidationException::withMessages([
                'fifo_position' => ['FIFO queue position is read-only and comes from warehouse reservations.'],
            ]);
        }

        $old = [
            'scheduled_start' => $order->scheduled_start?->toDateString(),
            'scheduled_end' => $order->scheduled_end?->toDateString(),
        ];

        $order->fill(array_intersect_key($data, array_flip(['scheduled_start', 'scheduled_end'])));
        $order->save();

        $this->audit->scheduleReordered($order, $old, [
            'scheduled_start' => $order->scheduled_start?->toDateString(),
            'scheduled_end' => $order->scheduled_end?->toDateString(),
        ]);

        return $order->fresh();
    }

    public function fifoSequenceForProject(int $projectId): int
    {
        $reservation = StockReservation::query()
            ->where('project_id', $projectId)
            ->orderByDesc('id')
            ->first();

        return (int) ($reservation?->fifo_sequence ?? 0);
    }
}
