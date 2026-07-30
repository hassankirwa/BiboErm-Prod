<?php

namespace App\Http\Controllers\Warehouse\Inventory;

use App\Http\Controllers\Controller;
use App\Services\Warehouse\Inventory\CatalogPutawayBinService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PutawayOptionsController extends Controller
{
    public function __construct(
        protected CatalogPutawayBinService $putawayBins,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => ['required', 'array', 'min:1', 'max:200'],
            'item_ids.*' => ['integer', 'distinct', 'exists:warehouse_items,id'],
        ]);

        return response()->json([
            'data' => $this->putawayBins->optionsForItemIds($validated['item_ids']),
        ]);
    }
}
