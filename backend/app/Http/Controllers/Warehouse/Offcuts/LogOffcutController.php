<?php

namespace App\Http\Controllers\Warehouse\Offcuts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\Offcuts\LogOffcutRequest;
use App\Http\Resources\Warehouse\OffcutResource;
use App\Models\Warehouse\Bin;
use App\Services\Warehouse\Offcuts\OffcutLoggingService;

class LogOffcutController extends Controller
{
    public function __construct(
        protected OffcutLoggingService $offcutLogging,
    ) {}

    public function __invoke(LogOffcutRequest $request): OffcutResource
    {
        $data = $request->validated();

        $bin = Bin::query()->findOrFail($data['bin_id']);
        $this->authorize('logOffcut', $bin);

        $offcut = $this->offcutLogging->log(
            user: $request->user(),
            itemId: $data['item_id'],
            binId: $data['bin_id'],
            lengthMm: $data['length_mm'],
            quantityPieces: $data['quantity_pieces'] ?? 1,
            sourceProjectId: $data['source_project_id'] ?? null,
            notes: $data['notes'] ?? null,
        );

        return new OffcutResource($offcut);
    }
}
