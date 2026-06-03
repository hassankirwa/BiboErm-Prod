<?php

namespace App\Http\Controllers\Warehouse\Offcuts;

use App\Enums\Warehouse\OffcutStorageArea;
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

        if (
            ($data['storage_area'] ?? OffcutStorageArea::WarehouseDeck->value) !== OffcutStorageArea::ProductionWorkspace->value
            && isset($data['bin_id'])
        ) {
            $bin = Bin::query()->findOrFail($data['bin_id']);
            $this->authorize('logOffcut', $bin);
        }

        $offcut = $this->offcutLogging->logFromArray(
            user: $request->user(),
            data: $data,
            sourceProjectId: $data['source_project_id'] ?? null,
        );

        return new OffcutResource($offcut);
    }
}
