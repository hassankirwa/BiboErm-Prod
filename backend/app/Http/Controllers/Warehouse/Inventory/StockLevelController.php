<?php

namespace App\Http\Controllers\Warehouse\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\StockLevelResource;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockLevel;
use App\Support\Warehouse\DeckAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StockLevelController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $allowedDecks = DeckAccess::allowedDeckSlugs($request->user());

        $query = StockLevel::query()
            ->with(['item', 'bin.section.deck'])
            ->when($request->query('deck'), fn ($q, $deck) => $q->whereHas(
                'bin.section.deck',
                fn ($dq) => $dq->where('slug', $deck)
            ))
            ->when($request->query('section_id'), fn ($q, $sectionId) => $q->whereHas(
                'bin',
                fn ($bq) => $bq->where('section_id', $sectionId)
            ))
            ->when($request->query('bin_id'), fn ($q, $binId) => $q->where('bin_id', $binId))
            ->when($allowedDecks !== [] && ! DeckAccess::canViewAll($request->user()), function ($q) use ($allowedDecks) {
                $q->whereHas('bin.section.deck', fn ($dq) => $dq->whereIn('slug', $allowedDecks));
            })
            ->when($request->boolean('low_stock'), function ($q) {
                $q->whereHas('item', function ($iq) {
                    $iq->whereColumn('stock_levels.quantity_on_hand', '<', 'warehouse_items.min_stock_qty');
                });
            });

        return StockLevelResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function byLocation(Request $request): AnonymousResourceCollection
    {
        return $this->index($request);
    }

    public function forItem(int $item): AnonymousResourceCollection
    {
        $model = Item::query()->findOrFail($item);

        $levels = StockLevel::query()
            ->where('item_id', $model->id)
            ->with(['bin.section.deck', 'item'])
            ->get();

        return StockLevelResource::collection($levels);
    }
}
