<?php

namespace App\Http\Controllers\Warehouse\Tools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Tools\IssueToolRequest;
use App\Http\Resources\Warehouse\ToolResource;
use App\Models\User;
use App\Models\Warehouse\Tool;
use App\Services\Warehouse\Tools\ToolIssuanceService;

class IssueToolController extends Controller
{
    public function __construct(
        protected ToolIssuanceService $toolIssuance,
    ) {}

    public function __invoke(IssueToolRequest $request, Tool $tool): ToolResource
    {
        $data = $request->validated();

        $issuedTo = User::query()->findOrFail($data['issued_to']);

        $this->toolIssuance->issue(
            tool: $tool,
            issuedTo: $issuedTo,
            issuedBy: $request->user(),
            projectId: $data['project_id'] ?? null,
            conditionOut: $data['condition_out'] ?? null,
        );

        return new ToolResource($tool->fresh());
    }
}
