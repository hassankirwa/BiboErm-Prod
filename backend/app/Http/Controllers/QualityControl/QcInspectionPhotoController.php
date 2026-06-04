<?php

namespace App\Http\Controllers\QualityControl;

use App\Http\Controllers\Controller;
use App\Http\Resources\QualityControl\QcInspectionResource;
use App\Models\QualityControl\QcInspection;
use App\Services\QualityControl\QcInspectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QcInspectionPhotoController extends Controller
{
    public function __construct(
        protected QcInspectionService $service,
    ) {}

    public function store(Request $request, QcInspection $inspection): JsonResponse
    {
        $this->authorize('uploadPhoto', $inspection);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp'],
            'checklist_key' => ['nullable', 'string', 'max:80'],
            'defect_id' => ['nullable', 'integer', 'exists:qc_defects,id'],
            'caption' => ['nullable', 'string'],
        ]);

        $photo = $this->service->uploadPhoto(
            $inspection,
            $request->user(),
            $validated['file'],
            $validated['checklist_key'] ?? null,
            $validated['defect_id'] ?? null,
            $validated['caption'] ?? null,
        );

        return response()->json([
            'data' => [
                'id' => $photo->id,
                'inspection_id' => $photo->inspection_id,
                'checklist_key' => $photo->checklist_key,
                'file_path' => $photo->file_path,
                'caption' => $photo->caption,
            ],
        ], 201);
    }
}
