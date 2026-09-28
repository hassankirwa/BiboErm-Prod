<?php

namespace App\Http\Controllers\Warehouse\MaterialRequests;

use App\Enums\Warehouse\MaterialRequestSource;
use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\MaterialRequestResource;
use App\Models\Warehouse\MaterialRequest;
use App\Services\Warehouse\MaterialRequests\MaterialRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MaterialRequestController extends Controller
{
    public function __construct(
        protected MaterialRequestService $requests,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', 'string'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'source' => ['nullable', 'string', Rule::enum(MaterialRequestSource::class)],
        ]);

        $query = MaterialRequest::query()
            ->with(['lines.item', 'project', 'requester', 'fulfiller', 'purchaseRequisition', 'stockMovement'])
            ->latest('id');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }
        if (! empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }

        return MaterialRequestResource::collection($query->paginate(min(100, (int) $request->input('per_page', 50))));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'source' => ['nullable', 'string', Rule::enum(MaterialRequestSource::class)],
            'reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.warehouse_item_id' => ['required', 'integer', 'exists:warehouse_items,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.notes' => ['nullable', 'string', 'max:500'],
        ]);

        $source = MaterialRequestSource::tryFrom($data['source'] ?? '')
            ?? ($request->user()->can('production.manage') || $request->user()->can('production.view')
                ? MaterialRequestSource::Production
                : MaterialRequestSource::Warehouse);

        // Prefer explicit warehouse when caller has warehouse issue rights and no source sent.
        if (! isset($data['source']) && $request->user()->can('warehouse.stock.issue')) {
            $source = MaterialRequestSource::Warehouse;
        }

        try {
            $created = $this->requests->create(
                user: $request->user(),
                projectId: (int) $data['project_id'],
                lines: $data['lines'],
                source: $source,
                reason: $data['reason'] ?? null,
                notes: $data['notes'] ?? null,
            );
        } catch (ValidationException $e) {
            throw $e;
        }

        return (new MaterialRequestResource($created))
            ->response()
            ->setStatusCode(201);
    }

    public function fulfill(Request $request, MaterialRequest $materialRequest): MaterialRequestResource
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
            'draft_shortage_requisition' => ['sometimes', 'boolean'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.line_id' => ['required', 'integer'],
            'lines.*.from_bin_id' => ['required', 'integer', 'exists:warehouse_bins,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        $updated = $this->requests->fulfill(
            user: $request->user(),
            request: $materialRequest,
            fulfillLines: $data['lines'],
            draftShortageRequisition: $request->boolean('draft_shortage_requisition', true),
            notes: $data['notes'] ?? null,
        );

        return new MaterialRequestResource($updated);
    }

    public function reject(Request $request, MaterialRequest $materialRequest): MaterialRequestResource
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->requests->reject(
            user: $request->user(),
            request: $materialRequest,
            notes: $data['notes'] ?? null,
        );

        return new MaterialRequestResource($updated);
    }
}
