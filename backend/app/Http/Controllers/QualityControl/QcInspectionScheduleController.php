<?php

namespace App\Http\Controllers\QualityControl;

use App\Http\Controllers\Controller;
use App\Http\Requests\QualityControl\StoreQcScheduleRequest;
use App\Http\Resources\QualityControl\QcScheduleResource;
use App\Models\QualityControl\QcInspectionSchedule;
use App\Services\QualityControl\QcScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QcInspectionScheduleController extends Controller
{
    public function __construct(
        protected QcScheduleService $service,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('qc.view'), 403);

        $query = QcInspectionSchedule::query()->latest('id');

        if ($request->filled('context')) {
            $query->where('context', $request->string('context'));
        }

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        return QcScheduleResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(StoreQcScheduleRequest $request): JsonResponse
    {
        $schedule = $this->service->create($request->user(), $request->validated());

        return (new QcScheduleResource($schedule))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, QcInspectionSchedule $schedule): QcScheduleResource
    {
        abort_unless($request->user()?->can('qc.schedules.manage'), 403);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'frequency' => ['sometimes', 'string', 'in:daily,weekly,biweekly,monthly,quarterly'],
            'frequency_interval' => ['sometimes', 'integer', 'min:1'],
            'warehouse_deck_slug' => ['nullable', 'string', 'max:40'],
            'warehouse_section_id' => ['nullable', 'integer'],
            'tool_scope' => ['nullable', 'string', 'max:30'],
            'assigned_role' => ['nullable', 'string', 'max:50'],
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'template_id' => ['nullable', 'integer', 'exists:qc_checklist_templates,id'],
            'next_due_at' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $updated = $this->service->update($schedule, $validated);

        return new QcScheduleResource($updated);
    }
}
