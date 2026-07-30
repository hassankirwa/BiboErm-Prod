<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Http\Requests\Production\UpdateProductionOrderStatusRequest;
use App\Http\Requests\Production\UpdateScheduleRequest;
use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Http\Resources\Production\ProductionOrderResource;
use App\Models\Production\ProductionOrder;
use App\Services\Production\ProductionOrderService;
use App\Services\QualityControl\QcInspectionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductionOrderController extends Controller
{
    public function __construct(
        protected ProductionOrderService $orders,
        protected QcInspectionService $qcInspections,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', ProductionOrder::class);

        $this->orders->syncOrdersForMaterialsReadyProjects();

        $query = ProductionOrder::query()
            ->with(['project', 'stageLogs', 'teams.user'])
            ->orderBy('fifo_position');

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if (
            $request->boolean('assigned_to_me')
            && ! $request->user()->can('production.schedule.manage')
            && ! $request->user()->can('production.manage')
        ) {
            $query->whereHas('teams', fn ($teamQuery) => $teamQuery->where('user_id', $request->user()->id));
        }

        if ($stage = $request->query('stage')) {
            $query->where('current_stage', $stage);
        }

        return ProductionOrderResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function show(ProductionOrder $order): ProductionOrderResource
    {
        $this->authorize('view', $order);

        // Backfill mandatory after-assembly QC if finishing already advanced the order.
        if ($order->current_stage === ProductionStage::QcPostFabrication) {
            $this->qcInspections->createFromProductionStage(
                $order->project_id,
                $order->id,
                ProductionStage::QcPostFabrication->value,
            );
        }

        $order->load(['project', 'stageLogs', 'teams.user', 'cuttingSheets', 'materialReleases']);

        return new ProductionOrderResource($order);
    }

    public function updateSchedule(UpdateScheduleRequest $request, ProductionOrder $order): ProductionOrderResource
    {
        $this->authorize('updateSchedule', $order);

        $updated = $this->orders->updateSchedule($order, $request->validated());

        return new ProductionOrderResource($updated->load('project'));
    }

    public function updateStatus(
        UpdateProductionOrderStatusRequest $request,
        ProductionOrder $order,
    ): ProductionOrderResource {
        $this->authorize('manageStages', $order);

        $status = ProductionOrderStatus::from($request->validated('status'));
        $updated = $this->orders->updateStatus($order, $status);

        return new ProductionOrderResource($updated->load('project'));
    }
}
