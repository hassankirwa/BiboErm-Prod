<?php

namespace App\Http\Controllers\Warehouse\Tools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Tools\ReturnToolRequest;
use App\Models\Warehouse\ToolIssuance;
use App\Services\Warehouse\Tools\ToolIssuanceService;
use Illuminate\Http\JsonResponse;

class ReturnToolController extends Controller
{
    public function __construct(
        protected ToolIssuanceService $toolIssuance,
    ) {}

    public function __invoke(ReturnToolRequest $request, ToolIssuance $issuance): JsonResponse
    {
        $data = $request->validated();

        $updated = $this->toolIssuance->returnTool(
            issuance: $issuance,
            conditionIn: $data['condition_in'] ?? null,
            damageNotes: $data['damage_notes'] ?? null,
        );

        return response()->json([
            'id' => $updated->id,
            'tool_id' => $updated->tool_id,
            'return_date' => $updated->return_date?->toDateString(),
            'condition_in' => $updated->condition_in,
            'damage_notes' => $updated->damage_notes,
        ]);
    }
}
