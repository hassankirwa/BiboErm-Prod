<?php

namespace App\Http\Controllers\Warehouse\Movements;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Movements\TransferStockRequest;
use App\Http\Resources\Warehouse\StockMovementResource;
use App\Services\Warehouse\Movements\StockMovementService;

class TransferStockController extends Controller
{
    public function __construct(
        protected StockMovementService $movements,
    ) {}

    public function __invoke(TransferStockRequest $request): StockMovementResource
    {
        $data = $request->validated();

        $movement = $this->movements->transfer(
            performer: $request->user(),
            lines: $data['lines'],
            notes: $data['notes'] ?? null,
        );

        return new StockMovementResource($movement);
    }
}
