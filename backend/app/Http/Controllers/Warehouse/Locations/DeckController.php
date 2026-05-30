<?php

namespace App\Http\Controllers\Warehouse\Locations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\DeckResource;
use App\Http\Resources\Warehouse\SectionResource;
use App\Models\Warehouse\Deck;
use App\Support\Warehouse\DeckAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DeckController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $allowed = DeckAccess::allowedDeckSlugs($request->user());

        $decks = Deck::query()
            ->with('warehouse')
            ->when($allowed !== [], fn ($q) => $q->whereIn('slug', $allowed))
            ->orderBy('sort_order')
            ->get();

        return DeckResource::collection($decks);
    }

    public function sections(Deck $deck): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Deck::class);

        $deck->load(['sections.bins', 'sections.doorType']);

        return SectionResource::collection($deck->sections);
    }
}
