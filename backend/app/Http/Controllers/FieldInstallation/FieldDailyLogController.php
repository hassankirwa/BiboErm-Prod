<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Http\Controllers\Controller;
use App\Http\Requests\FieldInstallation\StoreDailyLogRequest;
use App\Http\Resources\FieldInstallation\FieldDailyLogResource;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Services\FieldInstallation\FieldDailyLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FieldDailyLogController extends Controller
{
    public function __construct(
        protected FieldDailyLogService $service,
    ) {}

    public function index(FieldInstallationJob $fieldJob): AnonymousResourceCollection
    {
        $this->authorize('view', $fieldJob);

        $logs = $fieldJob->dailyLogs()
            ->with('submitter')
            ->orderByDesc('log_date')
            ->get();

        return FieldDailyLogResource::collection($logs);
    }

    public function store(StoreDailyLogRequest $request, FieldInstallationJob $fieldJob): JsonResponse
    {
        $this->authorize('log', $fieldJob);

        $log = $this->service->submit($fieldJob, $request->user(), $request->validated());

        return (new FieldDailyLogResource($log))
            ->response()
            ->setStatusCode(201);
    }
}
