<?php

namespace App\Http\Controllers\Warehouse\Locations;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Locations\StoreSectionRequest;
use App\Http\Resources\Warehouse\BinResource;
use App\Http\Resources\Warehouse\SectionResource;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\Section;
use App\Support\Warehouse\DeckAccess;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SectionController extends Controller
{
    public function store(StoreSectionRequest $request): SectionResource
    {
        $data = $request->validated();

        $deck = Deck::query()->findOrFail($data['deck_id']);

        DeckAccess::assertCanManageDeck($request->user(), $deck);

        $section = Section::query()->create([
            ...$data,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => true,
        ]);

        return new SectionResource($section->load('doorType'));
    }

    public function bins(Section $section): AnonymousResourceCollection
    {
        $section->load('bins');

        return BinResource::collection($section->bins);
    }
}
