<?php

namespace App\Http\Controllers\Warehouse\Locations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\WarehouseResource;
use App\Models\Warehouse\Warehouse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WarehouseController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $warehouses = Warehouse::query()
            ->where('is_active', true)
            ->with(['decks.sections.bins'])
            ->orderBy('code')
            ->get();

        return WarehouseResource::collection($warehouses);
    }
}
