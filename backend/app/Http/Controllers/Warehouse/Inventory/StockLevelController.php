<?php

namespace App\Http\Controllers\Warehouse\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\StockLevelResource;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockLevel;
use App\Services\Warehouse\Inventory\ItemLocationLegendService;
use App\Services\Warehouse\MasterData\WarehouseMaterialCatalogExcelService;
use App\Support\Warehouse\DeckAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StockLevelController extends Controller
{
    public function __construct(
        protected WarehouseMaterialCatalogExcelService $catalogItems,
        protected ItemLocationLegendService $locationLegend,
    ) {}

    public function index(Request $request): AnonymousResourceCollection|JsonResponse
    {
        if ($request->boolean('catalog_only')) {
            return $this->catalogOnly($request);
        }

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

    public function byLocation(Request $request): AnonymousResourceCollection|JsonResponse
    {
        return $this->index($request);
    }

    public function forItem(Request $request, int $item): AnonymousResourceCollection|JsonResponse
    {
        $model = Item::query()->findOrFail($item);

        // Location legend: section cages / bins with qty per cage (zeros for mapped empty bins).
        if ($request->boolean('include_locations') || $request->boolean('legend')) {
            return response()->json($this->locationLegend->forItem($model));
        }

        $levels = StockLevel::query()
            ->where('item_id', $model->id)
            ->with(['bin.section.deck', 'item'])
            ->get();

        return StockLevelResource::collection($levels);
    }

    protected function catalogOnly(Request $request): JsonResponse
    {
        $request->validate([
            'catalog_tier' => ['nullable', 'string', 'in:premium,standard,balustrade,specialty'],
            'category' => ['nullable', 'string', 'in:aluminium_profile,accessory,rubber'],
            'search' => ['nullable', 'string', 'max:100'],
            'stock_status' => ['nullable', 'string', 'in:all,in_stock,low_stock,out_of_stock,zero,reserved'],
            'include_locations' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:5000'],
        ]);

        $includeLocations = $request->boolean('include_locations');
        // Keep list payloads modest; callers can raise per_page for exports (max 5000).
        $perPage = $includeLocations
            ? min($request->integer('per_page', 50), 200)
            : $request->integer('per_page', 50);
        $page = $request->integer('page', 1);

        $result = $this->catalogItems->listCatalogItems(
            $request->input('catalog_tier'),
            $request->input('search'),
            $request->input('category'),
            $page,
            $perPage,
            $request->input('stock_status', 'all'),
        );
        $items = $result['data'];

        if ($includeLocations) {
            $legends = $this->locationLegend->forItemIds(
                array_map(fn (array $item) => (int) $item['id'], $items)
            );

            $items = array_map(function (array $item) use ($legends) {
                $legend = $legends[(int) $item['id']] ?? ['data' => [], 'meta' => []];
                $item['locations'] = $legend['data'];
                $item['locations_meta'] = $legend['meta'];
                $item['locations_count'] = $legend['meta']['locations_count'] ?? count($legend['data']);

                return $item;
            }, $items);
        }

        return response()->json([
            'data' => $items,
            'meta' => $result['meta'],
        ]);
    }
}
