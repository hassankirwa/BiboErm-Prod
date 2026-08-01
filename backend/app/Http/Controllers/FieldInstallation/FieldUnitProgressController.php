<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Enums\FieldInstallation\FieldUnitStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\FieldInstallation\UpdateFieldUnitRequest;
use App\Http\Resources\FieldInstallation\FieldUnitProgressResource;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldInstallationUnit;
use App\Services\FieldInstallation\FieldUnitProgressService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FieldUnitProgressController extends Controller
{
    public function __construct(
        protected FieldUnitProgressService $service,
    ) {}

    public function index(FieldInstallationJob $fieldJob): AnonymousResourceCollection
    {
        $this->authorize('view', $fieldJob);

        $this->service->ensureMeasurementUnits($fieldJob);

        return FieldUnitProgressResource::collection(
            $fieldJob->units()->with('photos')->orderBy('sort_order')->get()
        );
    }

    public function update(UpdateFieldUnitRequest $request, FieldInstallationUnit $unit): FieldUnitProgressResource
    {
        $unit->loadMissing('job');
        $this->authorize('log', $unit->job);

        $updated = $this->service->updateStatus(
            $unit,
            FieldUnitStatus::from($request->input('status')),
            $request->user()->id,
            $request->input('snag_notes'),
            $request->input('misfit_notes'),
        );

        return new FieldUnitProgressResource($updated);
    }
}
