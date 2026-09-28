<?php

namespace App\Http\Controllers\Warehouse\Movements;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Movements\ReturnStockRequest;
use App\Http\Resources\Warehouse\StockMovementResource;
use App\Services\Warehouse\Movements\StockMovementService;

class ReturnStockController extends Controller
{
    public function __construct(
        protected StockMovementService $movements,
    ) {}

    public function __invoke(ReturnStockRequest $request): StockMovementResource
    {
        $data = $request->validated();

        $movement = $this->movements->returnStock(
            performer: $request->user(),
            lines: $data['lines'],
            projectId: isset($data['project_id']) ? (int) $data['project_id'] : null,
            notes: $data['notes'] ?? null,
        );

        return new StockMovementResource($movement);
    }
}
