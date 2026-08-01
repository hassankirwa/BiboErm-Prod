<?php

namespace App\Http\Controllers\Warehouse\Reservations;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Reservations\AdjustReservationRequest;
use App\Http\Resources\Warehouse\StockReservationResource;
use App\Models\Project;
use App\Services\Warehouse\Reservations\FifoReservationService;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;

class AdjustProjectReservationController extends Controller
{
    public function __construct(
        protected FifoReservationService $fifoReservation,
        protected WarehouseAuditLogger $audit,
    ) {}

    public function __invoke(AdjustReservationRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();

        try {
            $result = $this->fifoReservation->adjustHeldQuantity(
                user: $request->user(),
                projectId: $project->id,
                itemId: (int) $data['item_id'],
                targetQuantity: (string) $data['quantity_reserved'],
                notes: $data['notes'] ?? null,
                bomLineRef: $data['bom_line_ref'] ?? null,
            );
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        $this->audit->reservationAdjusted($result['reservation']->id, [
            'project_id' => $project->id,
            'item_id' => (int) $data['item_id'],
            'previous_qty' => $result['previous_qty'],
            'quantity_reserved' => $result['quantity_reserved'],
            'bom_line_ref' => $data['bom_line_ref'] ?? null,
            'performed_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'previous_qty' => $result['previous_qty'],
            'quantity_reserved' => $result['quantity_reserved'],
            'reservation' => new StockReservationResource($result['reservation']),
        ]);
    }
}
