<?php

namespace App\Http\Controllers\Warehouse\Tools;

use App\Enums\Warehouse\ToolCondition;
use App\Enums\Warehouse\ToolTrackingMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Tools\StoreToolRequest;
use App\Http\Resources\Warehouse\ToolResource;
use App\Models\Warehouse\Tool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ToolController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Tool::query()->orderBy('tool_code');

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        return ToolResource::collection($query->get());
    }

    public function store(StoreToolRequest $request): JsonResponse
    {
        $data = $request->validated();
        $trackingMode = $data['tracking_mode'] ?? ToolTrackingMode::Serialized->value;
        $totalQty = (int) ($data['total_qty'] ?? 1);

        if ($trackingMode === ToolTrackingMode::Serialized->value) {
            $totalQty = 1;
        }

        $tool = Tool::query()->create([
            ...$data,
            'tracking_mode' => $trackingMode,
            'total_qty' => max(1, $totalQty),
            'qty_in_repair' => 0,
            'condition' => $data['condition'] ?? ToolCondition::Good->value,
            'is_active' => true,
        ]);

        return (new ToolResource($tool))
            ->response()
            ->setStatusCode(201);
    }
}
