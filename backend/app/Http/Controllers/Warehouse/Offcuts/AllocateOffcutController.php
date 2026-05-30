<?php

namespace App\Http\Controllers\Warehouse\Offcuts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Offcuts\AllocateOffcutRequest;
use App\Http\Resources\Warehouse\OffcutResource;
use App\Models\Warehouse\OffcutPiece;
use App\Services\Warehouse\Offcuts\OffcutAllocationService;
use App\Services\Warehouse\WarehouseAuditLogger;

class AllocateOffcutController extends Controller
{
    public function __construct(
        protected OffcutAllocationService $allocation,
        protected WarehouseAuditLogger $audit,
    ) {}

    public function __invoke(AllocateOffcutRequest $request, OffcutPiece $offcut): OffcutResource
    {
        $this->authorize('allocate', $offcut);

        $allocated = $this->allocation->allocate($offcut, $request->validated('project_id'));

        $this->audit->offcutAllocated($allocated->id, [
            'project_id' => $request->validated('project_id'),
        ]);

        return new OffcutResource($allocated);
    }
}
