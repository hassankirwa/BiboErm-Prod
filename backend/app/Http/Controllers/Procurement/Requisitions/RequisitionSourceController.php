<?php

namespace App\Http\Controllers\Procurement\Requisitions;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\PurchaseRequisitionResource;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Project;
use App\Services\Procurement\Requisitions\RequisitionSourceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequisitionSourceController extends Controller
{
    public function __construct(
        protected RequisitionSourceService $sources,
    ) {}

    public function lowStock(Request $request): JsonResponse
    {
        $this->authorize('create', PurchaseRequisition::class);

        $items = $this->sources->lowStockSource();

        return response()->json([
            'data' => $items,
            'meta' => [
                'total_items' => count($items),
                'actionable_items' => count(array_filter(
                    $items,
                    fn (array $item) => (bool) ($item['can_create_requisition'] ?? false)
                )),
            ],
        ]);
    }

    public function storeLowStock(Request $request): JsonResponse
    {
        $this->authorize('create', PurchaseRequisition::class);

        $validated = $request->validate([
            'warehouse_item_ids' => ['required', 'array', 'min:1'],
            'warehouse_item_ids.*' => ['integer', 'exists:warehouse_items,id'],
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'notes' => ['nullable', 'string'],
            'lines' => ['nullable', 'array'],
            'lines.*.warehouse_item_id' => ['required', 'integer', 'exists:warehouse_items,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.001'],
        ]);

        $requisition = $this->sources->createFromLowStock(
            $request->user(),
            $validated['warehouse_item_ids'],
            $validated['notes'] ?? null,
            $validated['supplier_id'],
            $validated['lines'] ?? [],
        );

        return (new PurchaseRequisitionResource(
            $requisition->load(['lines.warehouseItem', 'project', 'supplier', 'requester', 'approver'])
        ))->response()->setStatusCode(201);
    }

    public function storeProjectMaterials(Request $request): JsonResponse
    {
        $this->authorize('create', PurchaseRequisition::class);

        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'project_bom_line_ids' => ['required', 'array', 'min:1'],
            'project_bom_line_ids.*' => ['integer', 'exists:project_bom_lines,id'],
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'notes' => ['nullable', 'string'],
            'lines' => ['nullable', 'array'],
            'lines.*.project_bom_line_id' => ['required', 'integer', 'exists:project_bom_lines,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.001'],
        ]);

        $project = Project::query()->findOrFail($validated['project_id']);

        $requisition = $this->sources->createFromProjectMaterials(
            $request->user(),
            $project,
            $validated['project_bom_line_ids'],
            $validated['notes'] ?? null,
            $validated['supplier_id'],
            $validated['lines'] ?? [],
        );

        return (new PurchaseRequisitionResource(
            $requisition->load(['lines.warehouseItem', 'project', 'supplier', 'requester', 'approver'])
        ))->response()->setStatusCode(201);
    }
}
