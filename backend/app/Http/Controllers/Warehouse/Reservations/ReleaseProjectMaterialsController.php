<?php

namespace App\Http\Controllers\Warehouse\Reservations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\StockReservationResource;
use App\Models\Project;
use App\Services\Warehouse\Reservations\ProjectMaterialsReleaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReleaseProjectMaterialsController extends Controller
{
    public function __construct(
        protected ProjectMaterialsReleaseService $release,
    ) {}

    public function __invoke(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $result = $this->release->releaseForProduction(
            project: $project,
            performer: $request->user(),
            notes: $data['notes'] ?? null,
        );

        return response()->json([
            'data' => [
                'reservation' => new StockReservationResource($result['reservation']),
                'movement_id' => $result['movement_id'],
                'offcut_lines' => $result['offcut_lines'],
                'project_stage' => $result['project_stage'],
            ],
        ]);
    }
}
