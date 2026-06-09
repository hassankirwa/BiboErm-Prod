<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadPhoto;
use App\Services\Crm\CrmAttachmentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreLeadPhotoController extends Controller
{
    public function __construct(
        protected CrmAttachmentStorageService $storage,
    ) {}

    public function __invoke(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('uploadPhotos', $lead);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:jpeg,jpg,png,webp', 'max:10240'],
            'caption' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $stored = $this->storage->store($validated['file'], 'lead-'.$lead->id);

        $photo = LeadPhoto::query()->create([
            'lead_id' => $lead->id,
            'file_path' => $stored['path'],
            'firebase_url' => $stored['url'] ?? null,
            'caption' => $validated['caption'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => [
                'id' => $photo->id,
                'file_path' => $photo->file_path,
                'url' => $stored['url'] ?? null,
                'caption' => $photo->caption,
            ],
        ], 201);
    }
}
