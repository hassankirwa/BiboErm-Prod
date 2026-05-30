<?php

namespace App\Http\Controllers\Warehouse\MasterData;

use App\Enums\Warehouse\ItemCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\MasterData\StoreRubberRequest;
use App\Http\Resources\Warehouse\ItemResource;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Rubber;
use App\Services\Warehouse\Reservations\RubberCompatibilityService;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class RubberController extends Controller
{
    public function __construct(
        protected RubberCompatibilityService $compatibility,
        protected WarehouseAuditLogger $audit,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        $items = Item::query()
            ->where('category', ItemCategory::Rubber)
            ->with('rubber')
            ->orderBy('sku')
            ->get();

        return ItemResource::collection($items);
    }

    public function store(StoreRubberRequest $request): ItemResource
    {
        $data = $request->validated();

        $item = DB::transaction(function () use ($data) {
            $item = Item::query()->create([
                'sku' => $data['sku'],
                'name' => $data['name'],
                'category' => ItemCategory::Rubber,
                'unit_of_measure' => $data['unit_of_measure'],
                'min_stock_qty' => $data['min_stock_qty'] ?? 0,
                'is_active' => true,
            ]);

            Rubber::query()->create([
                'item_id' => $item->id,
                'compatible_profile_ids' => $data['compatible_profile_ids'] ?? null,
                'default_section_id' => $data['default_section_id'] ?? null,
            ]);

            return $item;
        });

        $this->audit->masterDataUpdated($item->id, [
            'sku' => $item->sku,
            'category' => ItemCategory::Rubber->value,
            'action' => 'created',
        ]);

        return new ItemResource($item->load('rubber'));
    }

    public function suggest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'warehouse_item_id' => ['required', 'integer', 'exists:warehouse_items,id'],
        ]);

        return response()->json([
            'data' => $this->compatibility->suggestForBomLine((int) $data['warehouse_item_id']),
        ]);
    }
}
