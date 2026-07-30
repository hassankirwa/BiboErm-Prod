<?php

namespace App\Http\Controllers\Warehouse\MasterData;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\MasterData\StoreDoorTypeRequest;
use App\Http\Resources\Warehouse\DoorTypeResource;
use App\Models\Warehouse\DoorType;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

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

    public function update(Request $request, DoorType $doorType): DoorTypeResource
    {
        $data = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('door_types', 'code')->ignore($doorType->id)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'section_code' => ['sometimes', 'required', 'string', 'max:30'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $doorType->update($data);

        $this->audit->doorTypeUpdated($doorType->id, [
            ...$data,
            'action' => 'updated',
        ]);

        return new DoorTypeResource($doorType->fresh());
    }

    public function destroy(DoorType $doorType): JsonResponse
    {
        $doorType->update(['is_active' => false]);

        $this->audit->doorTypeUpdated($doorType->id, [
            'code' => $doorType->code,
            'action' => 'deactivated',
        ]);

        return response()->json(null, 204);
    }
}
