<?php

namespace App\Http\Controllers\Warehouse\Tools;

use App\Enums\Warehouse\ToolCondition;
use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Tools\StoreToolRequest;
use App\Http\Resources\Warehouse\ToolResource;
use App\Models\Warehouse\Tool;
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

    public function store(StoreToolRequest $request): ToolResource
    {
        $data = $request->validated();

        $tool = Tool::query()->create([
            ...$data,
            'condition' => $data['condition'] ?? ToolCondition::Good->value,
            'is_active' => true,
        ]);

        return new ToolResource($tool);
    }
}
