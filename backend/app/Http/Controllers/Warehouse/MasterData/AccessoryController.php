<?php

namespace App\Http\Controllers\Warehouse\MasterData;

use App\Enums\Warehouse\ItemCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\MasterData\StoreAccessoryRequest;
use App\Http\Resources\Warehouse\ItemResource;
use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\DoorTypeAccessory;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AccessoryController extends Controller
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
            ->where('category', ItemCategory::Accessory)
            ->where('is_active', true)
            ->when($request->query('door_type_id'), fn ($q, $id) => $q->where('door_type_id', $id))
            ->with(['accessory.defaultBin', 'doorType'])
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

    public function store(StoreAccessoryRequest $request): ItemResource
    {
        $data = $request->validated();

        $item = DB::transaction(function () use ($data) {
            $item = Item::query()->create([
                'sku' => $data['sku'],
                'name' => $data['name'],
                'category' => ItemCategory::Accessory,
                'unit_of_measure' => $data['unit_of_measure'],
                'door_type_id' => $data['door_type_id'],
                'min_stock_qty' => $data['min_stock_qty'] ?? 0,
                'is_active' => true,
            ]);

            Accessory::query()->create([
                'item_id' => $item->id,
                'door_type_id' => $data['door_type_id'],
                'default_bin_id' => $data['default_bin_id'] ?? null,
            ]);

            if (isset($data['standard_qty'])) {
                DoorTypeAccessory::query()->create([
                    'door_type_id' => $data['door_type_id'],
                    'item_id' => $item->id,
                    'standard_qty' => $data['standard_qty'],
                ]);
            }

            return $item;
        });

        $this->audit->masterDataUpdated($item->id, [
            'sku' => $item->sku,
            'category' => ItemCategory::Accessory->value,
            'action' => 'created',
        ]);

        return new ItemResource($item->load(['accessory', 'doorType']));
    }

    public function update(Request $request, Item $item): ItemResource
    {
        abort_unless($item->category === ItemCategory::Accessory, 404);

        $data = $request->validate([
            'sku' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('warehouse_items', 'sku')->ignore($item->id)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'unit_of_measure' => ['sometimes', 'required', 'string', 'max:20'],
            'door_type_id' => ['sometimes', 'required', 'exists:door_types,id'],
            'default_bin_id' => ['sometimes', 'nullable', 'exists:warehouse_bins,id'],
            'min_stock_qty' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'standard_qty' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($item, $data) {
            $item->update(collect($data)->only(['sku', 'name', 'unit_of_measure', 'door_type_id', 'min_stock_qty', 'is_active'])->all());
            $item->accessory()->updateOrCreate(
                ['item_id' => $item->id],
                collect($data)->only(['door_type_id', 'default_bin_id'])->all()
            );

            if (array_key_exists('standard_qty', $data) && isset($data['door_type_id'])) {
                DoorTypeAccessory::query()->updateOrCreate(
                    ['door_type_id' => $data['door_type_id'], 'item_id' => $item->id],
                    ['standard_qty' => $data['standard_qty']]
                );
            }
        });

        $this->audit->masterDataUpdated($item->id, [
            'sku' => $item->fresh()->sku,
            'category' => ItemCategory::Accessory->value,
            'action' => 'updated',
        ]);

        return new ItemResource($item->fresh(['accessory', 'doorType']));
    }

    public function destroy(Item $item): JsonResponse
    {
        abort_unless($item->category === ItemCategory::Accessory, 404);

        $item->update(['is_active' => false]);
        $this->audit->masterDataUpdated($item->id, [
            'sku' => $item->sku,
            'category' => ItemCategory::Accessory->value,
            'action' => 'deactivated',
        ]);

        return response()->json(null, 204);
    }
}
