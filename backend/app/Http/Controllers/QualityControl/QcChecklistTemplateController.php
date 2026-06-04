<?php

namespace App\Http\Controllers\QualityControl;

use App\Http\Controllers\Controller;
use App\Http\Requests\QualityControl\StoreQcTemplateRequest;
use App\Http\Resources\QualityControl\QcChecklistTemplateResource;
use App\Models\QualityControl\QcChecklistTemplate;
use App\Services\QualityControl\QcChecklistTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QcChecklistTemplateController extends Controller
{
    public function __construct(
        protected QcChecklistTemplateService $service,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', QcChecklistTemplate::class);

        $query = QcChecklistTemplate::query()
            ->with(['project.projectManager', 'project.account'])
            ->latest('id');

        if ($request->filled('context')) {
            $query->where('context', $request->string('context'));
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->boolean('system_only')) {
            $query->where('is_system', true);
        }

        return QcChecklistTemplateResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function show(QcChecklistTemplate $template): QcChecklistTemplateResource
    {
        $this->authorize('view', $template);

        return new QcChecklistTemplateResource($template);
    }

    public function store(StoreQcTemplateRequest $request): JsonResponse
    {
        $this->authorize('create', QcChecklistTemplate::class);

        $template = $this->service->create($request->user(), $request->validated());

        return (new QcChecklistTemplateResource($template))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, QcChecklistTemplate $template): QcChecklistTemplateResource
    {
        $this->authorize('update', $template);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'product_type' => ['nullable', 'string', 'max:64'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.key' => ['required_with:items', 'string', 'max:80'],
            'items.*.label' => ['required_with:items', 'string', 'max:255'],
            'items.*.type' => ['required_with:items', 'string', 'max:32'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $updated = $this->service->update($template, $validated);

        return new QcChecklistTemplateResource($updated);
    }

    public function clone(Request $request, QcChecklistTemplate $template): JsonResponse
    {
        $this->authorize('clone', $template);

        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
        ]);

        $clone = $this->service->cloneToProject($template, $request->user(), $validated['project_id']);

        return (new QcChecklistTemplateResource($clone))
            ->response()
            ->setStatusCode(201);
    }
}
