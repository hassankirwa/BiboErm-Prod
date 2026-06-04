<?php

namespace App\Http\Controllers\QualityControl;

use App\Http\Controllers\Controller;
use App\Http\Resources\QualityControl\QcDefectResource;
use App\Models\QualityControl\QcDefect;
use App\Models\QualityControl\QcInspection;
use App\Services\QualityControl\QcDefectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QcDefectController extends Controller
{
    public function __construct(
        protected QcDefectService $service,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('qc.view'), 403);

        $query = QcDefect::query()
            ->with([
                'inspection' => fn ($q) => $q->select('id', 'reference', 'context', 'project_id', 'goods_receipt_id'),
                'inspection.project:id,reference,name',
                'reportedByUser:id,name',
            ])
            ->latest('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('severity')) {
            $query->where('severity', $request->string('severity'));
        }

        if ($request->filled('project_id')) {
            $query->whereHas('inspection', fn ($q) => $q->where('project_id', $request->integer('project_id')));
        }

        if ($request->filled('inspection_id')) {
            $query->where('inspection_id', $request->integer('inspection_id'));
        }

        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(function ($builder) use ($term) {
                $builder->where('description', 'like', $term)
                    ->orWhereHas('inspection', fn ($q) => $q->where('reference', 'like', $term)
                        ->orWhereHas('project', fn ($pq) => $pq->where('name', 'like', $term)
                            ->orWhere('reference', 'like', $term)));
            });
        }

        return QcDefectResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request, QcInspection $inspection): JsonResponse
    {
        $this->authorize('addDefect', $inspection);

        $validated = $request->validate([
            'checklist_key' => ['nullable', 'string', 'max:80'],
            'severity' => ['required', 'string', 'in:critical,major,minor'],
            'description' => ['required', 'string', 'max:500'],
        ]);

        $defect = $this->service->create($inspection, $request->user(), $validated);

        return (new QcDefectResource($defect))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, QcDefect $defect): QcDefectResource
    {
        abort_unless(
            $request->user()?->can('qc.manage') || $request->user()?->can('qc.defects.resolve'),
            403
        );

        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:open,in_progress,resolved,waived'],
            'resolution_notes' => ['nullable', 'string'],
        ]);

        $updated = $this->service->resolve($defect, $request->user(), $validated);

        return new QcDefectResource($updated);
    }
}
