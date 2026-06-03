<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Http\Controllers\Controller;
use App\Http\Requests\FieldInstallation\StoreDeliveryRecordRequest;
use App\Http\Resources\FieldInstallation\FieldDeliveryRecordResource;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Services\FieldInstallation\FieldDeliveryRecordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FieldDeliveryRecordController extends Controller
{
    public function __construct(
        protected FieldDeliveryRecordService $service,
    ) {}

    public function index(FieldInstallationJob $fieldJob): AnonymousResourceCollection
    {
        $this->authorize('view', $fieldJob);

        $records = $fieldJob->deliveryRecords()
            ->with('lines')
            ->latest()
            ->get();

        return FieldDeliveryRecordResource::collection($records);
    }

    public function store(StoreDeliveryRecordRequest $request, FieldInstallationJob $fieldJob): JsonResponse
    {
        $this->authorize('deliver', $fieldJob);

        $record = $this->service->record($fieldJob, $request->user(), $request->validated());

        return (new FieldDeliveryRecordResource($record))
            ->response()
            ->setStatusCode(201);
    }
}
