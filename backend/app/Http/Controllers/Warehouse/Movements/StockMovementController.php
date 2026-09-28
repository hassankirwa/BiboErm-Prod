<?php

namespace App\Http\Controllers\Warehouse\Movements;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\StockMovementResource;
use App\Models\Warehouse\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StockMovementController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = StockMovement::query()
            ->with(['lines.item', 'lines.fromBin', 'lines.toBin', 'performer'])
            ->latest('performed_at');

        if ($type = $request->query('movement_type')) {
            $query->where('movement_type', $type);
        }

        return StockMovementResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }
}
