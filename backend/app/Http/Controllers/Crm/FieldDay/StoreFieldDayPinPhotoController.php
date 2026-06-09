<?php

namespace App\Http\Controllers\Crm\FieldDay;

use App\Http\Controllers\Controller;
use App\Models\FieldDayPin;
use App\Models\FieldDayPinPhoto;
use App\Services\Crm\CrmAttachmentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreFieldDayPinPhotoController extends Controller
{
    public function __construct(
        protected CrmAttachmentStorageService $storage,
    ) {}

    public function __invoke(Request $request, FieldDayPin $fieldDayPin): JsonResponse
    {
        $this->authorize('update', $fieldDayPin->fieldDay);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:jpeg,jpg,png,webp', 'max:10240'],
            'caption' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $stored = $this->storage->store($validated['file'], 'field-day-pin-'.$fieldDayPin->id);

        $photo = FieldDayPinPhoto::query()->create([
            'field_day_pin_id' => $fieldDayPin->id,
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
