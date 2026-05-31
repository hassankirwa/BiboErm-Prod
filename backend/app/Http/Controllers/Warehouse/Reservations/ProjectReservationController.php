<?php

namespace App\Http\Controllers\Warehouse\Reservations;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Reservations\ReserveStockRequest;
use App\Http\Requests\Warehouse\Reservations\StockCheckRequest;
use App\Http\Resources\Warehouse\StockReservationResource;
use App\Models\Project;
use App\Models\Warehouse\StockReservation;
use App\Services\Warehouse\Reservations\FifoQueueDemandRegistry;
use App\Services\Warehouse\Reservations\ProjectMaterialReservationOrchestrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectReservationController extends Controller
{
    public function __construct(
        protected FifoQueueDemandRegistry $demandRegistry,
        protected ProjectMaterialReservationOrchestrator $orchestrator,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = StockReservation::query()
            ->with(['project', 'lines.item', 'lines.bin', 'reservedByUser'])
            ->orderBy('fifo_sequence');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        return StockReservationResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function stockCheck(StockCheckRequest $request, Project $project): JsonResponse
    {
        $lines = $request->validated('lines');

        $this->demandRegistry->record($project->id, $lines);

        return response()->json(
            app(\App\Services\Warehouse\Reservations\BomStockCheckService::class)
                ->check($project->id, $lines)
        );
    }

    public function reserve(ReserveStockRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();

        $result = $this->orchestrator->process(
            projectId: $project->id,
            user: $request->user(),
            bomLines: $data['lines'],
            notes: $data['notes'] ?? null,
            emitEvents: $request->boolean('emit_events', true),
        );

        if (! $result['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Material shortage detected — partial reservation not allowed.',
                'check' => $result['check'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'reservation' => new StockReservationResource($result['reservation']),
            'check' => $result['check'],
        ]);
    }
}
