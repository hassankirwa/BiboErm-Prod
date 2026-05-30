<?php

namespace App\Http\Controllers\Warehouse\Offcuts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Offcuts\ConsumeOffcutRequest;
use App\Http\Resources\Warehouse\OffcutResource;
use App\Models\Warehouse\OffcutPiece;
use App\Services\Warehouse\Offcuts\OffcutAllocationService;
use App\Services\Warehouse\WarehouseAuditLogger;

class ConsumeOffcutController extends Controller
{
    public function __construct(
        protected OffcutAllocationService $offcutAllocation,
        protected WarehouseAuditLogger $audit,
    ) {}

    public function __invoke(ConsumeOffcutRequest $request, OffcutPiece $offcut): OffcutResource
    {
        $consumed = $this->offcutAllocation->markConsumed($offcut);

        $this->audit->offcutConsumed($consumed->id, [
            'status' => $consumed->status->value,
        ]);

        return new OffcutResource($consumed->fresh(['item', 'bin', 'allocatedProject']));
    }
}
