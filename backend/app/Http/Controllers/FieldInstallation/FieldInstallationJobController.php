<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Enums\Projects\ProjectDispatchStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\FieldInstallation\AssignFieldJobMemberRequest;
use App\Http\Requests\FieldInstallation\StoreFieldJobRequest;
use App\Http\Requests\FieldInstallation\UpdateFieldJobRequest;
use App\Http\Resources\FieldInstallation\FieldInstallationJobResource;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Projects\ProjectDispatch;
use App\Services\FieldInstallation\FieldInstallationJobService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FieldInstallationJobController extends Controller
{
    public function __construct(
        protected FieldInstallationJobService $service,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', FieldInstallationJob::class);

        $query = FieldInstallationJob::query()
            ->with(['project', 'teamLead', 'activeMembers.user'])
            ->latest();

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return FieldInstallationJobResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(StoreFieldJobRequest $request): JsonResponse
    {
        $this->authorize('create', FieldInstallationJob::class);

        $job = $this->service->create($request->user(), $request->validated());

        return (new FieldInstallationJobResource($job))
            ->response()
            ->setStatusCode(201);
    }

    public function show(FieldInstallationJob $fieldJob): FieldInstallationJobResource
    {
        $this->authorize('view', $fieldJob);

        $job = $fieldJob->load([
            'project',
            'teamLead',
            'activeMembers.user',
            'units',
            'toolAssignments.toolIssuance.tool',
            'toolAssignments.toolIssuance.issuedToUser',
            'toolAssignments.assignedByUser',
        ]);

        $assignedDispatch = ProjectDispatch::query()
            ->where('project_id', $job->project_id)
            ->with('driver')
            ->orderByRaw(
                'CASE WHEN status IN (?, ?) THEN 0 ELSE 1 END',
                [
                    ProjectDispatchStatus::Scheduled->value,
                    ProjectDispatchStatus::InTransit->value,
                ],
            )
            ->latest('dispatched_at')
            ->latest('id')
            ->first();

        $job->setRelation('assignedDispatch', $assignedDispatch);

        return new FieldInstallationJobResource($job);
    }

    public function update(UpdateFieldJobRequest $request, FieldInstallationJob $fieldJob): FieldInstallationJobResource
    {
        $this->authorize('update', $fieldJob);

        $job = $this->service->update($fieldJob, $request->validated());

        return new FieldInstallationJobResource($job);
    }

    public function start(FieldInstallationJob $fieldJob): FieldInstallationJobResource
    {
        $this->authorize('start', $fieldJob);

        $job = $this->service->start($fieldJob, request()->user());

        return new FieldInstallationJobResource($job);
    }

    public function complete(FieldInstallationJob $fieldJob): FieldInstallationJobResource
    {
        $this->authorize('complete', $fieldJob);

        $job = $this->service->complete($fieldJob, request()->user());

        return new FieldInstallationJobResource($job);
    }

    public function hold(FieldInstallationJob $fieldJob): FieldInstallationJobResource
    {
        $this->authorize('hold', $fieldJob);

        $job = $this->service->hold($fieldJob, request()->user());

        return new FieldInstallationJobResource($job);
    }

    public function cancel(FieldInstallationJob $fieldJob): FieldInstallationJobResource
    {
        $this->authorize('cancel', $fieldJob);

        $job = $this->service->cancel($fieldJob, request()->user());

        return new FieldInstallationJobResource($job);
    }

    public function storeMember(AssignFieldJobMemberRequest $request, FieldInstallationJob $fieldJob): JsonResponse
    {
        $this->authorize('update', $fieldJob);

        $member = $this->service->assignMember(
            $fieldJob,
            $request->integer('user_id'),
            $request->input('role', 'engineer'),
            $request->user(),
        );

        return response()->json(['data' => [
            'id' => $member->id,
            'user_id' => $member->user_id,
            'role' => $member->role,
        ]], 201);
    }

    public function destroyMember(FieldInstallationJob $fieldJob, int $userId): JsonResponse
    {
        $this->authorize('update', $fieldJob);

        $this->service->removeMember($fieldJob, $userId);

        return response()->json(['message' => 'Member removed']);
    }
}
