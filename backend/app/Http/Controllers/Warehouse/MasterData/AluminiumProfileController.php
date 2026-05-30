<?php

namespace App\Http\Controllers\Warehouse\MasterData;

use App\Enums\Warehouse\ItemCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\MasterData\StoreAluminiumProfileRequest;
use App\Http\Resources\Warehouse\ItemResource;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AluminiumProfileController extends Controller
{
    public function __construct(
        protected WarehouseAuditLogger $audit,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        $items = Item::query()
            ->where('category', ItemCategory::AluminiumProfile)
            ->with('aluminiumProfile')
            ->orderBy('sku')
            ->get();

        return ItemResource::collection($items);
    }

    public function store(StoreAluminiumProfileRequest $request): ItemResource
    {
        $data = $request->validated();

        $item = DB::transaction(function () use ($data) {
            $item = Item::query()->create([
                'sku' => $data['sku'],
                'name' => $data['name'],
                'category' => ItemCategory::AluminiumProfile,
                'unit_of_measure' => $data['unit_of_measure'],
                'min_stock_qty' => $data['min_stock_qty'] ?? 0,
                'is_active' => true,
            ]);

            AluminiumProfile::query()->create([
                'item_id' => $item->id,
                'profile_family' => $data['profile_family'],
                'width_mm' => $data['width_mm'] ?? null,
                'depth_mm' => $data['depth_mm'] ?? null,
                'finish' => $data['finish'] ?? null,
                'weight_per_metre' => $data['weight_per_metre'] ?? null,
                'standard_bar_length_mm' => $data['standard_bar_length_mm'] ?? null,
            ]);

            return $item;
        });

        $this->audit->masterDataUpdated($item->id, [
            'sku' => $item->sku,
            'category' => ItemCategory::AluminiumProfile->value,
            'action' => 'created',
        ]);

        return new ItemResource($item->load('aluminiumProfile'));
    }
}
