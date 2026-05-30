<?php

namespace App\Http\Controllers\Warehouse\MasterData;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\MasterData\StoreDoorTypeRequest;
use App\Http\Resources\Warehouse\DoorTypeResource;
use App\Models\Warehouse\DoorType;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DoorTypeController extends Controller
{
    public function __construct(
        protected WarehouseAuditLogger $audit,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        return DoorTypeResource::collection(
            DoorType::query()->where('is_active', true)->orderBy('code')->get()
        );
    }

    public function store(StoreDoorTypeRequest $request): DoorTypeResource
    {
        $data = $request->validated();

        $doorType = DoorType::query()->create([...$data, 'is_active' => true]);

        $this->audit->doorTypeUpdated($doorType->id, [
            'code' => $doorType->code,
            'name' => $doorType->name,
            'section_code' => $doorType->section_code,
            'action' => 'created',
        ]);

        return new DoorTypeResource($doorType);
    }
}
