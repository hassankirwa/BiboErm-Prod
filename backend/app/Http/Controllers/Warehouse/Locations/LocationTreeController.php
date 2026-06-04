<?php

namespace App\Http\Controllers\Warehouse\Locations;

use App\Enums\Warehouse\DeckSlug;
use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\WarehouseResource;
use App\Models\Warehouse\Warehouse;
use App\Support\Warehouse\DeckAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LocationTreeController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $allowed = $this->resolveAllowedDeckSlugs($request);

        $warehouses = Warehouse::query()
            ->where('is_active', true)
            ->with([
                'decks' => function ($query) use ($allowed) {
                    $query->when($allowed !== [], fn ($q) => $q->whereIn('slug', $allowed))
                        ->orderBy('sort_order')
                        ->with([
                            'sections' => fn ($q) => $q->where('is_active', true)
                                ->orderBy('sort_order')
                                ->with([
                                    'doorType',
                                    'bins' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                                ]),
                        ]);
                },
            ])
            ->orderBy('code')
            ->get();

        return WarehouseResource::collection($warehouses);
    }

    /**
     * Receiving / putaway needs every deck (profiles, accessories, rubbers), not only a manager's deck.
     *
     * @return list<string>
     */
    protected function resolveAllowedDeckSlugs(Request $request): array
    {
        $user = $request->user();

        if (DeckAccess::canViewAll($user)) {
            return array_column(DeckSlug::cases(), 'value');
        }

        $needsFullTree = $request->boolean('for_putaway')
            || $user->can('procurement.grn.view')
            || $user->can('procurement.grn.verify')
            || $user->can('procurement.grn.create')
            || $user->can('warehouse.stock.receive');

        if ($needsFullTree) {
            return array_column(DeckSlug::cases(), 'value');
        }

        $allowed = DeckAccess::allowedDeckSlugs($user);

        return $allowed !== [] ? $allowed : array_column(DeckSlug::cases(), 'value');
    }
}
