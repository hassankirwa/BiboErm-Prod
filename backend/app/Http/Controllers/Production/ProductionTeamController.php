<?php

namespace App\Http\Controllers\Production;

use App\Enums\Production\ProductionStage;
use App\Enums\Production\TeamRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Production\AssignProductionTeamRequest;
use App\Http\Resources\Production\ProductionOrderTeamResource;
use App\Models\Production\ProductionOrder;
use App\Models\Production\ProductionOrderTeam;
use App\Services\Production\ProductionAuditLogger;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductionTeamController extends Controller
{
    public function __construct(
        protected ProductionAuditLogger $audit,
    ) {}

    public function index(ProductionOrder $order): AnonymousResourceCollection
    {
        $this->authorize('view', $order);

        return ProductionOrderTeamResource::collection(
            $order->teams()->with('user')->get()
        );
    }

    public function store(AssignProductionTeamRequest $request, ProductionOrder $order): ProductionOrderTeamResource
    {
        $this->authorize('assignTeam', $order);

        $data = $request->validated();
        $role = TeamRole::from($data['role']);

        $team = ProductionOrderTeam::query()->updateOrCreate(
            [
                'production_order_id' => $order->id,
                'user_id' => $data['user_id'],
                'stage' => $data['stage'],
            ],
            [
                'role' => $role,
                'assigned_at' => now(),
                'assigned_by' => $request->user()->id,
                'notes' => $data['notes'] ?? null,
            ],
        );

        if (in_array($role, [TeamRole::CuttingLead, TeamRole::FabricationLead], true)) {
            $order->update(['assigned_team_lead' => $data['user_id']]);
        }

        $this->audit->teamAssigned($team->load('user'), [
            'stage' => ProductionStage::from($data['stage'])->value,
            'role' => $data['role'],
        ]);

        return new ProductionOrderTeamResource($team);
    }
}
