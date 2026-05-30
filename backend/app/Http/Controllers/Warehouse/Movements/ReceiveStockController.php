<?php

namespace App\Http\Controllers\Warehouse\Movements;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Movements\ReceiveStockRequest;
use App\Http\Resources\Warehouse\StockMovementResource;
use App\Services\Warehouse\Inventory\PutawayBinResolver;
use App\Services\Warehouse\Movements\StockMovementService;

class ReceiveStockController extends Controller
{
    public function __construct(
        protected StockMovementService $movements,
        protected PutawayBinResolver $putawayBins,
    ) {}

    public function __invoke(ReceiveStockRequest $request): StockMovementResource
    {
        $data = $request->validated();

        $referenceType = $data['reference_type'] ?? (isset($data['goods_receipt_id']) ? 'goods_receipt' : null);
        $referenceId = $data['goods_receipt_id'] ?? null;

        $lines = array_map(function (array $line) {
            return [
                'item_id' => (int) $line['item_id'],
                'to_bin_id' => $this->putawayBins->resolve(
                    (int) $line['item_id'],
                    isset($line['to_bin_id']) ? (int) $line['to_bin_id'] : null,
                ),
                'quantity' => $line['quantity'],
                'unit_cost' => $line['unit_cost'] ?? null,
            ];
        }, $data['lines']);

        $movement = $this->movements->receive(
            performer: $request->user(),
            lines: $lines,
            referenceType: $referenceType,
            referenceId: $referenceId,
            notes: $data['notes'] ?? null,
        );

        return new StockMovementResource($movement);
    }
}
