<?php

namespace App\Http\Controllers\Warehouse\Offcuts;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\OffcutResource;
use App\Models\Warehouse\OffcutPiece;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OffcutController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', OffcutPiece::class);

        $query = OffcutPiece::query()
            ->with(['item', 'bin.section.deck'])
            ->latest('logged_at');

        $skuSearch = trim((string) ($request->query('sku')
            ?? $request->query('profile')
            ?? $request->query('q')
            ?? ''));

        if ($skuSearch !== '') {
            $like = '%'.$skuSearch.'%';
            $query->where(function ($outer) use ($like) {
                $outer->where('offcut_number', 'like', $like)
                    ->orWhere('notes', 'like', $like)
                    ->orWhereHas('item', function ($q) use ($like) {
                        $q->where('sku', 'like', $like)
                            ->orWhere('name', 'like', $like);
                    });
            });
        }

        if ($itemId = $request->query('item_id')) {
            $query->where('item_id', $itemId);
        }

        if ($minLength = $request->integer('min_length')) {
            $query->where('length_mm', '>=', $minLength);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return OffcutResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }
}
