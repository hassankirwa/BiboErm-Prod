<?php

namespace App\Http\Controllers\Warehouse\Tools;

use App\Enums\Warehouse\ToolIncidentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Tools\StoreToolIncidentRequest;
use App\Http\Requests\Warehouse\Tools\UpdateToolIncidentRequest;
use App\Http\Resources\Warehouse\ToolIncidentResource;
use App\Models\Warehouse\ToolIncident;
use App\Services\Warehouse\Tools\ToolIncidentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use InvalidArgumentException;

class ToolIncidentController extends Controller
{
    public function __construct(
        protected ToolIncidentService $incidents,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ToolIncident::query()
            ->with(['tool', 'responsibleUser', 'reportedByUser', 'replacementTool'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('tool_id')) {
            $query->where('tool_id', $request->integer('tool_id'));
        }

        return ToolIncidentResource::collection($query->get());
    }

    public function store(StoreToolIncidentRequest $request): JsonResponse
    {
        $incident = $this->incidents->report($request->user(), $request->validated());

        return (new ToolIncidentResource($incident))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateToolIncidentRequest $request, ToolIncident $toolIncident): ToolIncidentResource
    {
        $data = $request->validated();
        $status = ToolIncidentStatus::from($data['status']);

        try {
            if ($status === ToolIncidentStatus::InRepair) {
                $incident = $this->incidents->startRepair($toolIncident);
            } else {
                $incident = $this->incidents->resolve($toolIncident, $data);
            }
        } catch (InvalidArgumentException $e) {
            abort(422, $e->getMessage());
        }

        return new ToolIncidentResource($incident);
    }
}
