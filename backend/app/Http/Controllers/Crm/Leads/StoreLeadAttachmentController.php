<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadAttachment;
use App\Services\Crm\CrmAttachmentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreLeadAttachmentController extends Controller
{
    public function __construct(
        protected CrmAttachmentStorageService $storage,
    ) {}

    public function __invoke(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('update', $lead);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $stored = $this->storage->store($validated['file'], 'leads/'.$lead->id);

        $attachment = LeadAttachment::query()->create([
            'lead_id' => $lead->id,
            'file_path' => $stored['path'],
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => [
                'id' => $attachment->id,
                'file_path' => $attachment->file_path,
                'url' => $stored['url'],
            ],
        ], 201);
    }
}
