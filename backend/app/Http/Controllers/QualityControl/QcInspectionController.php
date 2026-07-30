<?php

namespace App\Http\Controllers\QualityControl;

use App\Http\Controllers\Controller;
use App\Http\Requests\QualityControl\SkipQcInspectionRequest;
use App\Http\Requests\QualityControl\StoreQcInspectionRequest;
use App\Http\Requests\QualityControl\SubmitQcInspectionRequest;
use App\Http\Resources\QualityControl\QcInspectionResource;
use App\Models\QualityControl\QcInspection;
use App\Services\QualityControl\QcInspectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QcInspectionController extends Controller
{
    public function __construct(
        protected QcInspectionService $service,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', QcInspection::class);

        $query = QcInspection::query()
            ->with(['template', 'inspector', 'project.projectManager', 'project.account'])
            ->withCount('defects')
            ->latest('id');

        if ($request->filled('context')) {
            $query->where('context', $request->string('context'));
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->filled('result')) {
            $query->where('result', $request->string('result'));
        }

        if ($request->filled('goods_receipt_id')) {
            $query->where('goods_receipt_id', $request->integer('goods_receipt_id'));
        }

        if ($request->filled('production_order_id')) {
            $query->where('production_order_id', $request->integer('production_order_id'));
        }

        if ($request->filled('field_installation_job_id')) {
            $query->where('field_installation_job_id', $request->integer('field_installation_job_id'));
        }

        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(function ($builder) use ($term) {
                $builder->where('reference', 'like', $term)
                    ->orWhereHas('project', fn ($q) => $q->where('name', 'like', $term)
                        ->orWhere('reference', 'like', $term));
            });
        }

        return QcInspectionResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function show(QcInspection $inspection): QcInspectionResource
    {
        $this->authorize('view', $inspection);

        $inspection = $this->service->ensureDefaultTemplate($inspection);

        return new QcInspectionResource(
            $inspection->load(['template', 'defects', 'photos', 'inspector', 'completedByUser', 'project.projectManager', 'project.account'])
        );
    }

    public function store(StoreQcInspectionRequest $request): JsonResponse
    {
        $this->authorize('create', QcInspection::class);

        $inspection = $this->service->start($request->user(), $request->validated());

        return (new QcInspectionResource($inspection))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, QcInspection $inspection): QcInspectionResource
    {
        $this->authorize('update', $inspection);

        $validated = $request->validate([
            'checklist_responses' => ['sometimes', 'array'],
            'custom_items' => ['sometimes', 'array'],
            'notes' => ['nullable', 'string'],
            'internal_notes' => ['nullable', 'string'],
        ]);

        $updated = $this->service->saveDraft($inspection, $request->user(), $validated);

        return new QcInspectionResource(
            $updated->load(['template', 'defects', 'photos', 'project.projectManager', 'project.account'])
        );
    }

    public function submit(SubmitQcInspectionRequest $request, QcInspection $inspection): QcInspectionResource
    {
        $this->authorize('submit', $inspection);

        $updated = $this->service->submit($inspection, $request->user(), $request->validated());

        return new QcInspectionResource($updated);
    }

    public function skip(SkipQcInspectionRequest $request, QcInspection $inspection): QcInspectionResource
    {
        $this->authorize('submit', $inspection);

        $updated = $this->service->skip(
            $inspection,
            $request->user(),
            $request->validated('notes'),
        );

        return new QcInspectionResource($updated);
    }
}
