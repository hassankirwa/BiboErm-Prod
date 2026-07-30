<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Http\Controllers\Controller;
use App\Http\Requests\FieldInstallation\StoreDailyLogRequest;
use App\Http\Requests\FieldInstallation\UpdateDailyLogRequest;
use App\Http\Resources\FieldInstallation\FieldDailyLogResource;
use App\Models\FieldInstallation\FieldInstallationDailyLog;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Services\FieldInstallation\FieldDailyLogService;
use App\Services\FieldInstallation\FieldUnitProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FieldDailyLogController extends Controller
{
    public function __construct(
        protected FieldDailyLogService $service,
        protected FieldUnitProgressService $unitProgress,
    ) {}

    public function index(FieldInstallationJob $fieldJob): AnonymousResourceCollection
    {
        $this->authorize('view', $fieldJob);

        $logs = $fieldJob->dailyLogs()
            ->with(['submitter', 'photos'])
            ->orderByDesc('log_date')
            ->get();

        return FieldDailyLogResource::collection($logs);
    }

    public function store(StoreDailyLogRequest $request, FieldInstallationJob $fieldJob): JsonResponse
    {
        $this->authorize('log', $fieldJob);

        $log = $this->service->submit($fieldJob, $request->user(), $request->validated());

        return (new FieldDailyLogResource($log->load(['submitter', 'photos'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateDailyLogRequest $request, FieldInstallationDailyLog $dailyLog): FieldDailyLogResource
    {
        $dailyLog->loadMissing('job');
        $this->authorize('log', $dailyLog->job);

        $dailyLog->update($request->validated());

        if ($request->has('units_completed') || $request->has('percent_today')) {
            $this->unitProgress->recalculateJobPercent($dailyLog->job);
        }

        return new FieldDailyLogResource($dailyLog->fresh(['submitter', 'photos']));
    }
}
