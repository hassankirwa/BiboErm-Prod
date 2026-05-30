<?php

namespace App\Http\Controllers\Warehouse\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\ItemResource;
use App\Http\Resources\Warehouse\LocationPathResource;
use App\Http\Resources\Warehouse\StockLevelResource;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockLevel;
use App\Services\Warehouse\Inventory\ItemLocationResolver;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ItemSearchController extends Controller
{
    public function __construct(
        protected ItemLocationResolver $locationResolver,
    ) {}

    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $search = (string) $request->query('q', '');

        $items = Item::query()
            ->where('is_active', true)
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('sku', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->with(['stockLevels.bin.section.deck', 'doorType', 'aluminiumProfile', 'accessory', 'rubber'])
            ->limit(50)
            ->get();

        return ItemResource::collection($items);
    }

    public function withLocations(Request $request): AnonymousResourceCollection
    {
        $search = (string) $request->query('q', '');

        $levels = StockLevel::query()
            ->with(['item', 'bin.section.deck.warehouse'])
            ->whereHas('item', function ($q) use ($search) {
                if ($search !== '') {
                    $q->where('sku', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                }
            })
            ->limit(50)
            ->get()
            ->map(function (StockLevel $level) {
                return array_merge(
                    (new StockLevelResource($level))->resolve(),
                    ['location_path' => $this->locationResolver->pathForBin($level->bin)]
                );
            });

        return LocationPathResource::collection($levels);
    }
}
