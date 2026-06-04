<?php

namespace App\Http\Controllers\FieldInstallation;

use App\Http\Controllers\Controller;
use App\Http\Requests\FieldInstallation\StoreFieldPhotoRequest;
use App\Http\Resources\FieldInstallation\FieldInstallationPhotoResource;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldInstallationPhoto;
use App\Services\FieldInstallation\FieldPhotoStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FieldPhotoController extends Controller
{
    public function __construct(
        protected FieldPhotoStorageService $storage,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', FieldInstallationJob::class);

        $query = FieldInstallationPhoto::query()->latest('created_at');

        if ($request->filled('job_id')) {
            $query->where('job_id', $request->integer('job_id'));
        }

        return FieldInstallationPhotoResource::collection($query->get());
    }

    public function store(StoreFieldPhotoRequest $request): JsonResponse
    {
        $job = FieldInstallationJob::query()->findOrFail($request->integer('job_id'));
        $this->authorize('log', $job);

        $stored = $this->storage->store($request->file('file'), 'job-'.$job->id);

        $photo = FieldInstallationPhoto::query()->create([
            'job_id' => $job->id,
            'attachable_type' => $request->input('attachable_type'),
            'attachable_id' => $request->integer('attachable_id'),
            'file_path' => $stored['path'],
            'firebase_url' => $request->input('firebase_url'),
            'caption' => $request->input('caption'),
            'taken_at' => $request->input('taken_at'),
            'uploaded_by' => $request->user()->id,
            'created_at' => now(),
        ]);

        return (new FieldInstallationPhotoResource($photo))
            ->response()
            ->setStatusCode(201);
    }
}
