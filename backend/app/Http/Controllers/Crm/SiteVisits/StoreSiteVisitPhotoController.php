<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Models\SiteVisit;
use App\Models\SiteVisitPhoto;
use App\Services\Crm\CrmAttachmentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreSiteVisitPhotoController extends Controller
{
    public function __construct(
        protected CrmAttachmentStorageService $storage,
    ) {}

    public function __invoke(Request $request, SiteVisit $siteVisit): JsonResponse
    {
        if ($request->user()->can('site_visits.execute')) {
            $this->authorize('execute', $siteVisit);
        } else {
            $this->authorize('update', $siteVisit);
        }

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $stored = $this->storage->store($validated['file'], 'site-visits/'.$siteVisit->id);

        $photo = SiteVisitPhoto::query()->create([
            'site_visit_id' => $siteVisit->id,
            'file_path' => $stored['path'],
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => [
                'id' => $photo->id,
                'file_path' => $photo->file_path,
                'url' => $stored['url'],
            ],
        ], 201);
    }
}
