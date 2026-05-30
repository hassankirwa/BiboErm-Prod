<?php

namespace App\Http\Controllers\Warehouse\Locations;

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
        $allowed = DeckAccess::allowedDeckSlugs($request->user());

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
}
