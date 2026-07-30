<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Http\Controllers\Controller;
use App\Http\Requests\FieldInstallation\ReturnFieldToolAssignmentRequest;
use App\Http\Requests\FieldInstallation\StoreFieldToolIssueRequest;
use App\Http\Resources\FieldInstallation\FieldToolAssignmentResource;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldToolAssignment;
use App\Models\Warehouse\Tool;
use App\Models\User;
use App\Services\FieldInstallation\FieldToolAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FieldToolAssignmentController extends Controller
{
    public function __construct(
        protected FieldToolAssignmentService $service,
    ) {}

    public function index(FieldInstallationJob $fieldJob): AnonymousResourceCollection
    {
        $this->authorize('view', $fieldJob);

        $assignments = $fieldJob->toolAssignments()
            ->with(['toolIssuance.tool', 'toolIssuance.issuedToUser', 'assignedByUser'])
            ->latest('created_at')
            ->get();

        return FieldToolAssignmentResource::collection($assignments);
    }

    public function issue(StoreFieldToolIssueRequest $request, FieldInstallationJob $fieldJob): JsonResponse
    {
        $this->authorize('tools', $fieldJob);

        $data = $request->validated();
        $tool = Tool::query()->findOrFail($data['tool_id']);
        $issuedTo = User::query()->findOrFail($data['issued_to']);

        $assignment = $this->service->issue(
            job: $fieldJob,
            tool: $tool,
            issuedTo: $issuedTo,
            issuedBy: $request->user(),
            data: $data,
        );

        return (new FieldToolAssignmentResource($assignment))
            ->response()
            ->setStatusCode(201);
    }

    public function returnTool(ReturnFieldToolAssignmentRequest $request, FieldToolAssignment $toolAssignment): JsonResponse
    {
        $this->authorize('tools', $toolAssignment->job);

        $assignment = $this->service->returnAssignment(
            $toolAssignment,
            $request->user(),
            $request->validated(),
        );

        return (new FieldToolAssignmentResource($assignment))->response();
    }
}
