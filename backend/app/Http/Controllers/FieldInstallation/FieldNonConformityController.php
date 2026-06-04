<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Http\Controllers\Controller;
use App\Http\Requests\FieldInstallation\StoreNonConformityRequest;
use App\Http\Requests\FieldInstallation\UpdateNonConformityRequest;
use App\Http\Resources\FieldInstallation\FieldNonConformityResource;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldNonConformity;
use App\Services\FieldInstallation\FieldNonConformityService;
use Illuminate\Http\JsonResponse;

class FieldNonConformityController extends Controller
{
    public function __construct(
        protected FieldNonConformityService $service,
    ) {}

    public function index(FieldInstallationJob $fieldJob): JsonResponse
    {
        $this->authorize('view', $fieldJob);

        $ncs = $fieldJob->nonConformities()->latest('reported_at')->get();

        return response()->json([
            'data' => FieldNonConformityResource::collection($ncs),
        ]);
    }

    public function store(StoreNonConformityRequest $request, FieldInstallationJob $fieldJob): JsonResponse
    {
        $this->authorize('log', $fieldJob);

        $nc = $this->service->report($fieldJob, $request->user(), $request->validated());

        return (new FieldNonConformityResource($nc))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateNonConformityRequest $request, FieldNonConformity $nonConformity): FieldNonConformityResource
    {
        $nonConformity->loadMissing('job');
        $this->authorize('update', $nonConformity->job);

        $nc = $this->service->updateStatus($nonConformity, $request->user(), $request->validated());

        return new FieldNonConformityResource($nc);
    }
}
