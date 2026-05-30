<?php

namespace App\Http\Controllers\Warehouse\MasterData;

use App\Enums\Warehouse\ItemCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\MasterData\StoreAccessoryRequest;
use App\Http\Resources\Warehouse\ItemResource;
use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\DoorTypeAccessory;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AccessoryController extends Controller
{
    public function __construct(
        protected WarehouseAuditLogger $audit,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = Item::query()
            ->where('category', ItemCategory::Accessory)
            ->when($request->query('door_type_id'), fn ($q, $id) => $q->where('door_type_id', $id))
            ->with(['accessory.defaultBin', 'doorType'])
            ->orderBy('sku')
            ->get();

        return ItemResource::collection($items);
    }

    public function store(StoreAccessoryRequest $request): ItemResource
    {
        $data = $request->validated();

        $item = DB::transaction(function () use ($data) {
            $item = Item::query()->create([
                'sku' => $data['sku'],
                'name' => $data['name'],
                'category' => ItemCategory::Accessory,
                'unit_of_measure' => $data['unit_of_measure'],
                'door_type_id' => $data['door_type_id'],
                'min_stock_qty' => $data['min_stock_qty'] ?? 0,
                'is_active' => true,
            ]);

            Accessory::query()->create([
                'item_id' => $item->id,
                'door_type_id' => $data['door_type_id'],
                'default_bin_id' => $data['default_bin_id'] ?? null,
            ]);

            if (isset($data['standard_qty'])) {
                DoorTypeAccessory::query()->create([
                    'door_type_id' => $data['door_type_id'],
                    'item_id' => $item->id,
                    'standard_qty' => $data['standard_qty'],
                ]);
            }

            return $item;
        });

        $this->audit->masterDataUpdated($item->id, [
            'sku' => $item->sku,
            'category' => ItemCategory::Accessory->value,
            'action' => 'created',
        ]);

        return new ItemResource($item->load(['accessory', 'doorType']));
    }
}
