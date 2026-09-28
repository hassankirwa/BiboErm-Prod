<?php

namespace App\Http\Controllers\Warehouse\Tools;

use App\Enums\Warehouse\ToolCondition;
use App\Enums\Warehouse\ToolTrackingMode;
use App\Enums\Warehouse\ToolType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Tools\StoreToolRequest;
use App\Http\Resources\Warehouse\ToolResource;
use App\Models\Warehouse\Tool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ToolController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'active_only' => ['sometimes', 'boolean'],
            'tool_type' => ['nullable', 'string', Rule::enum(ToolType::class)],
            'is_returnable' => ['sometimes', 'boolean'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $query = Tool::query()->orderBy('tool_code');

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        if (! empty($filters['tool_type'])) {
            $query->where('tool_type', $filters['tool_type']);
        }

        if (array_key_exists('is_returnable', $filters)) {
            $query->where('is_returnable', $request->boolean('is_returnable'));
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('tool_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        return ToolResource::collection($query->get());
    }

    public function types(): JsonResponse
    {
        $types = collect(ToolType::cases())->map(fn (ToolType $type) => [
            'value' => $type->value,
            'label' => $type->label(),
            'default_returnable' => $type->defaultReturnable(),
        ])->values();

        return response()->json(['data' => $types]);
    }

    public function store(StoreToolRequest $request): JsonResponse
    {
        $data = $request->validated();
        $trackingMode = $data['tracking_mode'] ?? ToolTrackingMode::Serialized->value;
        $totalQty = (int) ($data['total_qty'] ?? 1);
        $toolType = ToolType::from($data['tool_type']);

        if ($trackingMode === ToolTrackingMode::Serialized->value) {
            $totalQty = 1;
        }

        $isReturnable = array_key_exists('is_returnable', $data)
            ? (bool) $data['is_returnable']
            : $toolType->defaultReturnable();

        // Consumables/fasteners are almost always quantity-tracked.
        if (! $isReturnable && $trackingMode === ToolTrackingMode::Serialized->value) {
            $trackingMode = ToolTrackingMode::Quantity->value;
            $totalQty = max(1, (int) ($data['total_qty'] ?? 1));
        }

        $tool = Tool::query()->create([
            'tool_code' => $data['tool_code'],
            'name' => $data['name'],
            'tool_type' => $toolType,
            'is_returnable' => $isReturnable,
            'tracking_mode' => $trackingMode,
            'total_qty' => max(1, $totalQty),
            'qty_in_repair' => 0,
            'condition' => $data['condition'] ?? ToolCondition::Good->value,
            'purchase_date' => $data['purchase_date'] ?? null,
            'is_active' => true,
        ]);

        return (new ToolResource($tool))
            ->response()
            ->setStatusCode(201);
    }
}
