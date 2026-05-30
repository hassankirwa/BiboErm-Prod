<?php

namespace App\Http\Controllers\Warehouse\Locations;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Locations\StoreBinRequest;
use App\Http\Resources\Warehouse\BinResource;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Section;
use App\Support\Warehouse\DeckAccess;

class BinController extends Controller
{
    public function store(StoreBinRequest $request): BinResource
    {
        $data = $request->validated();

        $section = Section::query()->with('deck')->findOrFail($data['section_id']);

        DeckAccess::assertCanManageDeck($request->user(), $section->deck);

        $bin = Bin::query()->create([
            ...$data,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => true,
        ]);

        return new BinResource($bin);
    }
}
