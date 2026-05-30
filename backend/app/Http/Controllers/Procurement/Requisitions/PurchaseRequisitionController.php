<?php

namespace App\Http\Controllers\Procurement\Requisitions;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\PurchaseRequisitionResource;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Services\Procurement\Requisitions\PurchaseRequisitionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseRequisitionController extends Controller
{
    public function __construct(
        protected PurchaseRequisitionService $service,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', PurchaseRequisition::class);

        $query = PurchaseRequisition::query()->with(['lines', 'project', 'requester'])->latest();

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('trigger_type')) {
            $query->whereHas('lines', fn ($q) => $q->where('trigger_type', $request->string('trigger_type')));
        }

        return PurchaseRequisitionResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', PurchaseRequisition::class);

        $validated = $request->validate([
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'lines.*.warehouse_item_id' => ['nullable', 'integer', 'exists:inventory_items,id'],
            'lines.*.sku' => ['nullable', 'string', 'max:50'],
            'lines.*.trigger_type' => ['nullable', 'string'],
            'lines.*.estimated_unit_price' => ['nullable', 'numeric'],
        ]);

        $requisition = $this->service->createDraft($request->user(), $validated);

        return (new PurchaseRequisitionResource($requisition))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PurchaseRequisition $requisition): PurchaseRequisitionResource
    {
        $this->authorize('view', $requisition);

        return new PurchaseRequisitionResource($requisition->load(['lines', 'project', 'requester', 'approver']));
    }

    public function update(Request $request, PurchaseRequisition $requisition): PurchaseRequisitionResource
    {
        $this->authorize('update', $requisition);

        $validated = $request->validate([
            'notes' => ['nullable', 'string'],
            'lines' => ['sometimes', 'array', 'min:1'],
            'lines.*.description' => ['required_with:lines', 'string', 'max:255'],
            'lines.*.quantity' => ['required_with:lines', 'numeric', 'min:0.001'],
            'lines.*.warehouse_item_id' => ['nullable', 'integer', 'exists:inventory_items,id'],
        ]);

        if (array_key_exists('notes', $validated)) {
            $requisition->update(['notes' => $validated['notes']]);
        }

        if (isset($validated['lines'])) {
            $requisition->lines()->delete();
            foreach ($validated['lines'] as $line) {
                PurchaseRequisitionLine::query()->create([
                    'purchase_requisition_id' => $requisition->id,
                    'warehouse_item_id' => $line['warehouse_item_id'] ?? null,
                    'description' => $line['description'],
                    'sku' => $line['sku'] ?? null,
                    'quantity' => $line['quantity'],
                    'trigger_type' => $line['trigger_type'] ?? 'manual',
                ]);
            }
        }

        return new PurchaseRequisitionResource($requisition->fresh(['lines', 'project']));
    }
}
