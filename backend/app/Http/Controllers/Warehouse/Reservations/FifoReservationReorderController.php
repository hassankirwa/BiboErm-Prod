<?php

namespace App\Http\Controllers\Warehouse\Reservations;

use App\Http\Controllers\Controller;
use App\Services\Warehouse\Reservations\FifoReservationOverrideService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FifoReservationReorderController extends Controller
{
    public function __construct(
        protected FifoReservationOverrideService $overrideService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reservation_ids' => ['required', 'array', 'min:1'],
            'reservation_ids.*' => ['integer', 'exists:stock_reservations,id'],
        ]);

        $this->overrideService->reorder(
            user: $request->user(),
            reservationIdsInOrder: $data['reservation_ids'],
        );

        return response()->json([
            'success' => true,
            'message' => 'Reservation queue order updated.',
        ]);
    }
}
