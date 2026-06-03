<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Http\Controllers\Controller;
use App\Http\Requests\FieldInstallation\ReturnFieldToolAssignmentRequest;
use App\Http\Requests\FieldInstallation\StoreFieldToolIssueRequest;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldToolAssignment;
use App\Models\Warehouse\Tool;
use App\Models\User;
use App\Services\FieldInstallation\FieldToolAssignmentService;
use Illuminate\Http\JsonResponse;

class FieldToolAssignmentController extends Controller
{
    public function __construct(
        protected FieldToolAssignmentService $service,
    ) {}

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

        return response()->json([
            'data' => [
                'id' => $assignment->id,
                'job_id' => $assignment->job_id,
                'tool_issuance_id' => $assignment->tool_issuance_id,
                'expected_return_date' => $assignment->expected_return_date?->toDateString(),
            ],
        ], 201);
    }

    public function returnTool(ReturnFieldToolAssignmentRequest $request, FieldToolAssignment $toolAssignment): JsonResponse
    {
        $this->authorize('tools', $toolAssignment->job);

        $assignment = $this->service->returnAssignment(
            $toolAssignment,
            $request->user(),
            $request->validated(),
        );

        return response()->json([
            'data' => [
                'id' => $assignment->id,
                'returned_at' => $assignment->returned_at?->toIso8601String(),
            ],
        ]);
    }
}
