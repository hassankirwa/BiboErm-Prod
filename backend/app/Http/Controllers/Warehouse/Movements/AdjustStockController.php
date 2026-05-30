<?php

namespace App\Http\Controllers\Warehouse\Movements;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Movements\AdjustStockRequest;
use App\Http\Resources\Warehouse\StockMovementResource;
use App\Services\Warehouse\Movements\StockMovementService;

class AdjustStockController extends Controller
{
    public function __construct(
        protected StockMovementService $movements,
    ) {}

    public function __invoke(AdjustStockRequest $request): StockMovementResource
    {
        $data = $request->validated();

        $movement = $this->movements->adjust(
            performer: $request->user(),
            lines: $data['lines'],
            notes: $data['notes'] ?? null,
        );

        return new StockMovementResource($movement);
    }
}
