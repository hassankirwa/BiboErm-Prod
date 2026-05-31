<?php

namespace App\Http\Controllers\Warehouse\Movements;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Movements\IssueStockRequest;
use App\Http\Resources\Warehouse\StockMovementResource;
use App\Services\Warehouse\Movements\IssueStockService;

class IssueStockController extends Controller
{
    public function __construct(
        protected IssueStockService $issueStock,
    ) {}

    public function __invoke(IssueStockRequest $request): StockMovementResource
    {
        $data = $request->validated();

        if (isset($data['project_id'])) {
            $movement = $this->issueStock->issueToProject(
                performer: $request->user(),
                projectId: (int) $data['project_id'],
                lines: $data['lines'],
                notes: $data['notes'] ?? null,
            );
        } else {
            $movement = $this->issueStock->issue(
                performer: $request->user(),
                lines: $data['lines'],
                notes: $data['notes'] ?? null,
            );
        }

        return new StockMovementResource($movement);
    }
}
