<?php

namespace App\Http\Controllers\Procurement\Requisitions;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\PurchaseRequisitionResource;
use App\Models\Procurement\PurchaseRequisition;
use App\Services\Procurement\Requisitions\PurchaseRequisitionService;
use App\Services\Procurement\Requisitions\PurchaseRequisitionXlsxExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseRequisitionController extends Controller
{
    public function __construct(
        protected PurchaseRequisitionService $service,
        protected PurchaseRequisitionXlsxExportService $xlsxExport,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', PurchaseRequisition::class);

        $query = PurchaseRequisition::query()->with([
            'lines.warehouseItem',
            'lines.preferredSupplier',
            'project',
            'supplier',
            'requester',
            'approver',
            'purchaseOrders.lines',
        ])->withCount('purchaseOrders')->latest();

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
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'required_by' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'lines.*.required_quantity' => ['nullable', 'numeric', 'min:0.001'],
            'lines.*.warehouse_item_id' => ['nullable', 'integer', 'exists:warehouse_items,id'],
            'lines.*.sku' => ['nullable', 'string', 'max:50'],
            'lines.*.trigger_type' => ['nullable', 'string'],
            'lines.*.estimated_unit_price' => ['nullable', 'numeric'],
            'lines.*.preferred_supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
        ]);

        $requisition = $this->service->createDraft($request->user(), $validated);

        return (new PurchaseRequisitionResource($requisition))
            ->response()
            ->setStatusCode(201);
    }

    public function show(PurchaseRequisition $requisition): PurchaseRequisitionResource
    {
        $this->authorize('view', $requisition);

        return new PurchaseRequisitionResource(
            $requisition->load([
                'lines.warehouseItem',
                'lines.preferredSupplier',
                'project',
                'supplier',
                'requester',
                'approver',
                'purchaseOrders.lines',
            ])
        );
    }

    public function export(PurchaseRequisition $requisition)
    {
        $this->authorize('view', $requisition);

        $path = $this->xlsxExport->export($requisition);

        return response()
            ->download($path, $requisition->reference.'-materials.xlsx')
            ->deleteFileAfterSend(true);
    }

    public function update(Request $request, PurchaseRequisition $requisition): PurchaseRequisitionResource
    {
        $this->authorize('update', $requisition);

        $validated = $request->validate([
            'notes' => ['nullable', 'string'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'required_by' => ['nullable', 'date'],
            'lines' => ['sometimes', 'array', 'min:1'],
            'lines.*.id' => ['nullable', 'integer', 'exists:purchase_requisition_lines,id'],
            'lines.*.description' => ['required_without:lines.*.id', 'string', 'max:255'],
            'lines.*.quantity' => ['required_with:lines', 'numeric', 'min:0.001'],
            'lines.*.required_quantity' => ['nullable', 'numeric', 'min:0.001'],
            'lines.*.warehouse_item_id' => ['nullable', 'integer', 'exists:warehouse_items,id'],
            'lines.*.sku' => ['nullable', 'string', 'max:50'],
            'lines.*.preferred_supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'lines.*.estimated_unit_price' => ['nullable', 'numeric'],
            'lines.*.notes' => ['nullable', 'string'],
            'lines.*.trigger_type' => ['nullable', 'string'],
        ]);

        $requisition = $this->service->updateEditable($requisition, $validated);

        return new PurchaseRequisitionResource($requisition);
    }
}
