<?php

namespace App\Http\Controllers\Warehouse\MasterData;

use App\Enums\Warehouse\ItemCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\MasterData\StoreAluminiumProfileRequest;
use App\Http\Resources\Warehouse\ItemResource;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AluminiumProfileController extends Controller
{
    public function __construct(
        protected WarehouseAuditLogger $audit,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Item::query()
            ->select([
                'id',
                'sku',
                'name',
                'category',
                'unit_of_measure',
                'door_type_id',
                'min_stock_qty',
                'is_active',
                'catalog_tier',
                'description',
                'image_path',
            ])
            ->where('category', ItemCategory::AluminiumProfile)
            ->where('is_active', true)
            ->with('aluminiumProfile')
            ->orderBy('sku');

        if ($search = $request->query('search')) {
            $term = '%'.trim((string) $search).'%';
            $query->where(function ($builder) use ($term) {
                $builder->where('sku', 'like', $term)->orWhere('name', 'like', $term);
            });
        }

        if ($request->filled('per_page')) {
            return ItemResource::collection(
                $query->paginate(min($request->integer('per_page', 50), 200))
            );
        }

        return ItemResource::collection($query->limit(2000)->get());
    }

    public function store(StoreAluminiumProfileRequest $request): ItemResource
    {
        $data = $request->validated();

        $item = DB::transaction(function () use ($data) {
            $item = Item::query()->create([
                'sku' => $data['sku'],
                'name' => $data['name'],
                'category' => ItemCategory::AluminiumProfile,
                'unit_of_measure' => $data['unit_of_measure'],
                'min_stock_qty' => $data['min_stock_qty'] ?? 0,
                'is_active' => true,
            ]);

            AluminiumProfile::query()->create([
                'item_id' => $item->id,
                'profile_family' => $data['profile_family'],
                'width_mm' => $data['width_mm'] ?? null,
                'depth_mm' => $data['depth_mm'] ?? null,
                'finish' => $data['finish'] ?? null,
                'weight_per_metre' => $data['weight_per_metre'] ?? null,
                'standard_bar_length_mm' => $data['standard_bar_length_mm'] ?? null,
            ]);

            return $item;
        });

        $this->audit->masterDataUpdated($item->id, [
            'sku' => $item->sku,
            'category' => ItemCategory::AluminiumProfile->value,
            'action' => 'created',
        ]);

        return new ItemResource($item->load('aluminiumProfile'));
    }

    public function update(Request $request, Item $item): ItemResource
    {
        abort_unless($item->category === ItemCategory::AluminiumProfile, 404);

        $data = $request->validate([
            'sku' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('warehouse_items', 'sku')->ignore($item->id)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'unit_of_measure' => ['sometimes', 'required', 'string', 'max:20'],
            'min_stock_qty' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'profile_family' => ['sometimes', 'required', 'string', 'max:100'],
            'width_mm' => ['sometimes', 'nullable', 'numeric'],
            'depth_mm' => ['sometimes', 'nullable', 'numeric'],
            'finish' => ['sometimes', 'nullable', 'string', 'max:100'],
            'weight_per_metre' => ['sometimes', 'nullable', 'numeric'],
            'standard_bar_length_mm' => ['sometimes', 'nullable', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($item, $data) {
            $item->update(collect($data)->only(['sku', 'name', 'unit_of_measure', 'min_stock_qty', 'is_active'])->all());
            $item->aluminiumProfile()->updateOrCreate(
                ['item_id' => $item->id],
                collect($data)->only(['profile_family', 'width_mm', 'depth_mm', 'finish', 'weight_per_metre', 'standard_bar_length_mm'])->all()
            );
        });

        $this->audit->masterDataUpdated($item->id, [
            'sku' => $item->fresh()->sku,
            'category' => ItemCategory::AluminiumProfile->value,
            'action' => 'updated',
        ]);

        return new ItemResource($item->fresh('aluminiumProfile'));
    }

    public function destroy(Item $item): JsonResponse
    {
        abort_unless($item->category === ItemCategory::AluminiumProfile, 404);

        $item->update(['is_active' => false]);
        $this->audit->masterDataUpdated($item->id, [
            'sku' => $item->sku,
            'category' => ItemCategory::AluminiumProfile->value,
            'action' => 'deactivated',
        ]);

        return response()->json(null, 204);
    }
}
